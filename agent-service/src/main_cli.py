import argparse
import asyncio
import os
import yaml
from src.agent.runner import AgentRunner
from src.observability.logging import setup_logging

setup_logging()

async def main():
    parser = argparse.ArgumentParser(description="Zenith AI Browser Agent CLI")
    parser.add_argument("--task", type=str, required=True, help="Path to YAML task definition")
    args = parser.parse_args()

    if not os.path.exists(args.task):
        print(f"Error: Task file not found at {args.task}")
        return

    with open(args.task, "r", encoding="utf-8") as f:
        task_data = yaml.safe_load(f)

    goal = task_data.get("goal")
    output_path = task_data.get("output_path")
    max_steps = task_data.get("max_steps", 40)

    if not goal:
        print("Error: Task file must define a 'goal'")
        return

    print(f"--- Launching Task: {task_data.get('name', 'Unnamed')} ---")
    print(f"Goal: {goal}")
    print(f"Output path: {output_path}")

    runner = AgentRunner()
    report = await runner.run_goal(goal=goal, output_path=output_path, max_steps=max_steps)

    print("\n--- Task Run Finished ---")
    print(f"Success: {report['success']}")
    print(f"Duration: {report['duration_s']:.2f} seconds")
    print(f"Steps executed: {report['steps_count']}")
    if report.get("error"):
        print(f"Error: {report['error']}")

if __name__ == "__main__":
    asyncio.run(main())
