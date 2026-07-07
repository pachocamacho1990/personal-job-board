import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { navigateTo } from '../../router';
import { Sidebar } from '../../components/Sidebar';
import { ProfileExperience, ProfileEducation, ProfileLanguage, ProfileData } from '../../types';
import '../../styles/styles.css';
import '../../styles/profile.css';

export const ProfilePage: React.FC = () => {
  const [fullName, setFullName] = useState<string>('');
  const [headline, setHeadline] = useState<string>('');
  const [linkedinUrl, setLinkedinUrl] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [experience, setExperience] = useState<ProfileExperience[]>([]);
  const [education, setEducation] = useState<ProfileEducation[]>([]);
  const [languages, setLanguages] = useState<ProfileLanguage[]>([]);
  
  // Skills handling
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState<string>('');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Check auth and load profile on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigateTo('/jobboard/login.html');
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await api.profile.get();
        if (data && data.profile_data) {
          const profile: ProfileData = data.profile_data;
          setFullName(profile.full_name || '');
          setHeadline(profile.headline || '');
          setLinkedinUrl(profile.linkedin_url || '');
          setLocation(profile.location || '');
          setSummary(profile.summary || '');
          setExperience(profile.experience || []);
          setEducation(profile.education || []);
          setSkills(profile.skills || []);
          setLanguages(profile.languages || []);
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setError('No se pudo cargar el perfil profesional.');
      } finally {
        setIsLoading(false);
        // Remove app loading overlay if present
        const overlay = document.getElementById('appLoading');
        if (overlay) overlay.style.display = 'none';
      }
    };

    loadProfile();
  }, []);

  const handleAddExperience = () => {
    setExperience([...experience, { role: '', company: '', start_date: '', end_date: '', description: '' }]);
  };

  const handleRemoveExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const handleExperienceChange = (index: number, field: keyof ProfileExperience, value: string) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    setExperience(updated);
  };

  const handleAddEducation = () => {
    setEducation([...education, { degree: '', school: '', year: '' }]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const handleEducationChange = (index: number, field: keyof ProfileEducation, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  const handleAddLanguage = () => {
    setLanguages([...languages, { language: '', level: 'Profesional' }]);
  };

  const handleRemoveLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  const handleLanguageChange = (index: number, field: keyof ProfileLanguage, value: string) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    setLanguages(updated);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('El nombre completo es requerido.');
      return;
    }

    setIsSaving(true);

    const profileData: ProfileData = {
      full_name: fullName.trim(),
      headline: headline.trim(),
      linkedin_url: linkedinUrl.trim(),
      location: location.trim(),
      summary: summary.trim(),
      experience,
      education,
      skills,
      languages
    };

    try {
      const response = await api.profile.save(profileData);
      setSuccess('¡Perfil guardado correctamente!');
      
      // Notify AgentConsole that profile was saved
      window.dispatchEvent(new CustomEvent('profile-saved'));
      
      // Update local storage status cache if available
      localStorage.setItem('agentOnboardingStatus', response.onboarding_status);
      
      // Delay navigation slightly so they see success message
      setTimeout(() => {
        navigateTo('/jobboard/index.html');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'No se pudo guardar el perfil profesional.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="layout-container">
        <Sidebar activePage="profile" />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Cargando perfil...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Sidebar activePage="profile" />
      <main className="main-content" style={{ overflowY: 'auto' }}>
        <div className="profile-page-container">
          
          <div className="banner-claude-hint">
            <span className="banner-claude-hint-icon">🔮</span>
            <div>
              <strong>Consejo de Automatización:</strong> Puedes usar la extensión <strong>Claude for Chrome</strong> para ir a tu perfil de LinkedIn, copiar tu información y pedirle que rellene automáticamente este formulario.
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="profile-header">
              <h1>📋 Perfil Profesional</h1>
              <div className="profile-header-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => navigateTo('/jobboard/index.html')}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSaving}
                  id="profile-save-btn"
                >
                  {isSaving ? 'Guardando...' : '💾 Guardar y Continuar'}
                </button>
              </div>
            </div>

            {error && <div className="error-message" style={{ margin: '0 0 20px 0', padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: 'var(--color-danger)' }}>{error}</div>}
            {success && <div className="success-message" style={{ margin: '0 0 20px 0', padding: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', color: 'var(--color-success)' }}>{success}</div>}

            {/* Información Básica */}
            <div className="profile-section">
              <h2>Información Básica</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="profile-full-name">Nombre Completo *</label>
                  <input
                    type="text"
                    id="profile-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Francisco Camacho"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-headline">Headline / Titular Profesional</label>
                  <input
                    type="text"
                    id="profile-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Senior Software Architect & Agentic AI Specialist"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-linkedin-url">URL de LinkedIn</label>
                  <input
                    type="url"
                    id="profile-linkedin-url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/francisco-camacho"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profile-location">Ubicación</label>
                  <input
                    type="text"
                    id="profile-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Madrid, España"
                  />
                </div>
              </div>
            </div>

            {/* Resumen */}
            <div className="profile-section">
              <h2>Resumen Profesional</h2>
              <div className="form-group">
                <label htmlFor="profile-summary">Acerca de / Resumen</label>
                <textarea
                  id="profile-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Arquitecto de software con más de 8 años de experiencia. Especializado en..."
                  rows={4}
                />
              </div>
            </div>

            {/* Experiencia Laboral */}
            <div className="profile-section">
              <h2>
                Experiencia Laboral
                <button type="button" className="btn btn-secondary btn-add" onClick={handleAddExperience}>
                  + Agregar Puesto
                </button>
              </h2>
              {experience.map((exp, idx) => (
                <div key={idx} className="dynamic-item-card">
                  <button type="button" className="remove-btn" onClick={() => handleRemoveExperience(idx)}>
                    Eliminar
                  </button>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`exp-role-${idx}`}>Cargo / Rol</label>
                      <input
                        type="text"
                        id={`exp-role-${idx}`}
                        value={exp.role}
                        onChange={(e) => handleExperienceChange(idx, 'role', e.target.value)}
                        placeholder="Senior Software Architect"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`exp-company-${idx}`}>Empresa</label>
                      <input
                        type="text"
                        id={`exp-company-${idx}`}
                        value={exp.company}
                        onChange={(e) => handleExperienceChange(idx, 'company', e.target.value)}
                        placeholder="Zenith Global Tech"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`exp-start-${idx}`}>Año Inicio</label>
                      <input
                        type="text"
                        id={`exp-start-${idx}`}
                        value={exp.start_date}
                        onChange={(e) => handleExperienceChange(idx, 'start_date', e.target.value)}
                        placeholder="2023"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`exp-end-${idx}`}>Año Fin (o Presente)</label>
                      <input
                        type="text"
                        id={`exp-end-${idx}`}
                        value={exp.end_date}
                        onChange={(e) => handleExperienceChange(idx, 'end_date', e.target.value)}
                        placeholder="Presente"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label htmlFor={`exp-desc-${idx}`}>Descripción / Logros</label>
                      <textarea
                        id={`exp-desc-${idx}`}
                        value={exp.description}
                        onChange={(e) => handleExperienceChange(idx, 'description', e.target.value)}
                        placeholder="Diseñé e implementé la migración a microservicios..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Educación */}
            <div className="profile-section">
              <h2>
                Educación
                <button type="button" className="btn btn-secondary btn-add" onClick={handleAddEducation}>
                  + Agregar Educación
                </button>
              </h2>
              {education.map((edu, idx) => (
                <div key={idx} className="dynamic-item-card">
                  <button type="button" className="remove-btn" onClick={() => handleRemoveEducation(idx)}>
                    Eliminar
                  </button>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`edu-degree-${idx}`}>Título / Grado</label>
                      <input
                        type="text"
                        id={`edu-degree-${idx}`}
                        value={edu.degree}
                        onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)}
                        placeholder="Ingeniería de Software"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`edu-school-${idx}`}>Institución / Universidad</label>
                      <input
                        type="text"
                        id={`edu-school-${idx}`}
                        value={edu.school}
                        onChange={(e) => handleEducationChange(idx, 'school', e.target.value)}
                        placeholder="Universidad XYZ"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`edu-year-${idx}`}>Año de Graduación</label>
                      <input
                        type="text"
                        id={`edu-year-${idx}`}
                        value={edu.year}
                        onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                        placeholder="2016"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Habilidades */}
            <div className="profile-section">
              <h2>Habilidades</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  id="profile-new-skill"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Ej. Python, React, Docker"
                  style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddSkill}>
                  Agregar
                </button>
              </div>
              <div className="skills-container">
                {skills.map((skill, idx) => (
                  <span key={idx} className="skill-chip">
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)}>&times;</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Idiomas */}
            <div className="profile-section">
              <h2>
                Idiomas
                <button type="button" className="btn btn-secondary btn-add" onClick={handleAddLanguage}>
                  + Agregar Idioma
                </button>
              </h2>
              {languages.map((lang, idx) => (
                <div key={idx} className="dynamic-item-card" style={{ paddingBottom: '16px' }}>
                  <button type="button" className="remove-btn" onClick={() => handleRemoveLanguage(idx)}>
                    Eliminar
                  </button>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`lang-name-${idx}`}>Idioma</label>
                      <input
                        type="text"
                        id={`lang-name-${idx}`}
                        value={lang.language}
                        onChange={(e) => handleLanguageChange(idx, 'language', e.target.value)}
                        placeholder="Español"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`lang-level-${idx}`}>Nivel</label>
                      <select
                        id={`lang-level-${idx}`}
                        value={lang.level}
                        onChange={(e) => handleLanguageChange(idx, 'level', e.target.value)}
                      >
                        <option value="Nativo">Nativo / Bilingüe</option>
                        <option value="Profesional">Profesional completo</option>
                        <option value="Intermedio">Intermedio / Limitado</option>
                        <option value="Básico">Básico</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};
