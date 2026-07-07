import time
import os
import logging
from typing import Any, Dict, Optional
from browser_use import Agent, Browser, BrowserConfig
from ..llm.openai_compat import OpenAICompatibleProvider
from .state import TaskState
from .guards import SafetyGuards
from ..io import sinks

logger = logging.getLogger("agent.runner")

class AgentRunner:
    def __init__(self):
        self.provider = OpenAICompatibleProvider()
        self.guards = SafetyGuards()

    async def run_goal(
        self,
        goal: str,
        output_path: Optional[str] = None,
        max_steps: int = 40,
    ) -> Dict[str, Any]:
        start_time = time.time()
        logger.info(f"Starting browser agent run. Goal: {goal}")

        # Setup browser config
        cdp_url = os.getenv("CHROME_CDP_URL")
        headless_val = os.getenv("HEADLESS", "true").lower() == "true"
        
        browser_config = BrowserConfig(
            headless=headless_val,
        )
        if cdp_url:
            logger.info(f"Connecting to Chrome over CDP at {cdp_url}")
            browser_config.cdp_url = cdp_url

        browser = Browser(config=browser_config)
        llm = self.provider.get_chat_model()

        state = TaskState(goal=goal)

        # Initialize browser-use Agent
        agent = Agent(
            task=goal,
            llm=llm,
            browser=browser,
        )

        success = False
        error_msg = None
        history_steps = []

        try:
            # Execute browser-use loop
            result = await agent.run(max_steps=max_steps)
            success = True
            logger.info("Browser agent task completed successfully.")
            
            # Extract history steps from agent run
            if hasattr(result, 'history') and result.history:
                for idx, step in enumerate(result.history):
                    history_steps.append({
                        "step": idx + 1,
                        "action": str(step.model_actions) if hasattr(step, 'model_actions') else "",
                        "result": str(step.result) if hasattr(step, 'result') else ""
                    })
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error during browser agent run: {error_msg}", exc_info=True)
        finally:
            await browser.close()

        duration = time.time() - start_time
        report = {
            "success": success,
            "goal": goal,
            "duration_s": duration,
            "steps_count": len(history_steps),
            "history": history_steps,
            "error": error_msg,
        }

        # Save to output path if specified
        if output_path:
            if output_path.endswith(".json"):
                sinks.write_json(report, output_path)
            elif output_path.endswith(".csv"):
                # If output is csv, save the steps list
                sinks.write_csv(history_steps, output_path)
            logger.info(f"Run report written to {output_path}")

        return report
