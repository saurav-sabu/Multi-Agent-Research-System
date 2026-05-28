import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Award, 
  List, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ExternalLink, 
  Clock, 
  Settings, 
  AlertTriangle,
  RotateCcw,
  BookOpenCheck,
  Compass,
  Link
} from 'lucide-react';

function App() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('article');
  const [apiUrl, setApiUrl] = useState('http://localhost:8000/api/research');
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Custom Timer Ref for managing step progress simulation
  const stepTimerRef = useRef(null);

  // Define the multi-agent pipeline steps
  const steps = [
    { 
      id: 0, 
      label: 'Agent Expansion & Search', 
      desc: 'Formulating queries and retrieving top articles from Tavily Search...',
      duration: 4000 
    },
    { 
      id: 1, 
      label: 'Deep Web Scraping', 
      desc: 'Retrieving clean markdown contents using Browserless headless scraper...',
      duration: 6000 
    },
    { 
      id: 2, 
      label: 'Journalistic Synthesis', 
      desc: 'Claude is analyzing records, synthesizing findings, and drafting the article...',
      duration: 8000 
    },
    { 
      id: 3, 
      label: 'Editorial Evaluation', 
      desc: 'Running a structured peer-review rubric to score and critique the draft...',
      duration: 5000 
    }
  ];

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scribeflow_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Update history list
  const addToHistory = (newTopic) => {
    const updated = [newTopic, ...history.filter(t => t !== newTopic)].slice(0, 8);
    setHistory(updated);
    localStorage.setItem('scribeflow_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scribeflow_history');
  };

  // Stepper timeline loop
  const startStepSimulation = () => {
    setCurrentStep(0);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    
    let step = 0;
    stepTimerRef.current = setInterval(() => {
      if (step < steps.length - 1) {
        step += 1;
        setCurrentStep(step);
      } else {
        clearInterval(stepTimerRef.current);
      }
    }, 6000); // Progress steps roughly every 6 seconds
  };

  const handleResearchSubmit = async (e, customTopic = null) => {
    if (e) e.preventDefault();
    const activeTopic = customTopic || topic;
    if (!activeTopic.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTab('article');
    addToHistory(activeTopic);
    startStepSimulation();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: activeTopic }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setCurrentStep(steps.length); // mark all done
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while connecting to the ScribeFlow API.');
    } finally {
      setLoading(false);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    }
  };

  // Helper Markdown-like Parser
  const renderMarkdown = (md) => {
    if (!md) return null;
    const lines = md.split('\n');
    const elements = [];
    let listItems = [];
    let inList = false;

    const flushList = (key) => {
      if (listItems.length > 0) {
        elements.push(<ul className="md-ul" key={`ul-${key}`}>{listItems}</ul>);
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) {
        flushList(idx);
        elements.push(<h3 key={idx}>{parseInlineStyles(trimmed.substring(4))}</h3>);
      } else if (trimmed.startsWith('## ')) {
        flushList(idx);
        elements.push(<h2 key={idx}>{parseInlineStyles(trimmed.substring(3))}</h2>);
      } else if (trimmed.startsWith('# ')) {
        flushList(idx);
        elements.push(<h1 key={idx}>{parseInlineStyles(trimmed.substring(2))}</h1>);
      } 
      // Lists
      else if (trimmed.startsWith('- ')) {
        inList = true;
        listItems.push(<li key={`li-${idx}`}>{parseInlineStyles(trimmed.substring(2))}</li>);
      } else if (trimmed.startsWith('* ')) {
        inList = true;
        listItems.push(<li key={`li-${idx}`}>{parseInlineStyles(trimmed.substring(2))}</li>);
      } 
      // Blockquotes
      else if (trimmed.startsWith('> ')) {
        flushList(idx);
        elements.push(<blockquote key={idx}>{parseInlineStyles(trimmed.substring(2))}</blockquote>);
      } 
      // Empty line
      else if (trimmed === '') {
        flushList(idx);
      } 
      // Default paragraph
      else {
        if (inList) flushList(idx);
        elements.push(<p key={idx}>{parseInlineStyles(line)}</p>);
      }
    });

    flushList(lines.length);
    return elements;
  };

  // Bold / Inline Code parser helper
  const parseInlineStyles = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i}>{part}</strong>;
      }
      const subParts = part.split(/`([^`]+)`/g);
      return subParts.map((subPart, j) => {
        if (j % 2 === 1) {
          return <code key={j}>{subPart}</code>;
        }
        return subPart;
      });
    });
  };

  // Critique Parser logic
  const parseCritique = (text) => {
    if (!text) return null;

    const scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    const strengthsIndex = text.toUpperCase().indexOf("STRENGTHS:");
    const improvementsIndex = text.toUpperCase().indexOf("AREAS TO IMPROVE:");
    const verdictIndex = text.toUpperCase().indexOf("VERDICT:");

    let strengthsText = "";
    let improvementsText = "";
    let verdictText = "";

    if (strengthsIndex !== -1) {
      const end = improvementsIndex !== -1 ? improvementsIndex : (verdictIndex !== -1 ? verdictIndex : text.length);
      strengthsText = text.substring(strengthsIndex + 10, end);
    }

    if (improvementsIndex !== -1) {
      const end = verdictIndex !== -1 ? verdictIndex : text.length;
      improvementsText = text.substring(improvementsIndex + 17, end);
    }

    if (verdictIndex !== -1) {
      verdictText = text.substring(verdictIndex + 8);
    }

    const parseList = (listStr) => {
      return listStr
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('*'))
        .map(line => line.substring(1).trim());
    };

    const strengths = parseList(strengthsText);
    const improvements = parseList(improvementsText);

    return {
      score,
      strengths: strengths.length > 0 ? strengths : ["No specific strengths listed"],
      improvements: improvements.length > 0 ? improvements : ["No specific improvements recommended"],
      verdict: verdictText.trim() || text.substring(0, 100)
    };
  };

  // Tavily Search Parser logic
  const parseSources = (text) => {
    if (!text) return [];
    const rawSources = text.split('\n----\n');
    return rawSources.map(src => {
      const titleMatch = src.match(/Title:\s*(.*)/i);
      const urlMatch = src.match(/URL:\s*(.*)/i);
      const snippetMatch = src.match(/Snippet:\s*([\s\S]*)/i);

      return {
        title: titleMatch ? titleMatch[1].trim() : 'Search Reference',
        url: urlMatch ? urlMatch[1].trim() : '',
        snippet: snippetMatch ? snippetMatch[1].trim() : src
      };
    }).filter(s => s.url || s.snippet);
  };

  const parsedCritique = result ? parseCritique(result.critique) : null;
  const parsedSources = result ? parseSources(result.search_result) : [];

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 8) return 'var(--color-success)';
    if (score >= 5) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="brand-title">ScribeFlow</h1>
            <p className="brand-subtitle">Multi-Agent AI Journalism</p>
          </div>
        </div>
        
        <div className="panel-actions">
          <button 
            className="btn-icon-only" 
            title="Configure API Endpoint"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="source-card" style={{ animation: 'slideUp 0.3s ease-out', maxWidth: '400px', alignSelf: 'flex-end', marginTop: '-1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ fontWeight: 700 }}>Connection Settings</h4>
            <button className="tab-btn" onClick={() => setShowSettings(false)}>Close</button>
          </div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
            API Endpoint URL:
          </label>
          <input 
            type="text" 
            value={apiUrl} 
            onChange={(e) => setApiUrl(e.target.value)} 
            className="search-input" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px' }}
          />
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !result && (
        <div className="search-hero">
          <h2 className="hero-heading">
            Research, Draft & Critique. <br/>
            All in <span>One Agentic Flow.</span>
          </h2>
          <p className="hero-description">
            Provide a topic. ScribeFlow deploys cooperative autonomous agents to query, extract, write, and review complete articles with editorial oversight.
          </p>

          <form className="search-form" onSubmit={(e) => handleResearchSubmit(e)}>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text"
                placeholder="E.g., Impact of Generative AI on Software Engineering..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="search-input"
                required
              />
            </div>
            <button type="submit" className="generate-button" disabled={!topic.trim()}>
              <Sparkles size={18} />
              Compile Dossier
            </button>
          </form>

          {/* Search History */}
          {history.length > 0 && (
            <div style={{ width: '100%', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recent Topics
                </span>
                <button 
                  onClick={clearHistory} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {history.map((histTopic, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setTopic(histTopic);
                      handleResearchSubmit(null, histTopic);
                    }}
                    className="tab-btn" 
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '100px', padding: '0.4rem 1rem' }}
                  >
                    {histTopic}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stepper Loading View */}
      {loading && (
        <div className="loading-container">
          <div className="loading-header">
            <h3 className="loading-title">Deploying Agent Pipeline</h3>
            <p className="loading-subtitle">Retrieving parameters and invoking LLM sub-networks</p>
          </div>

          <div className="stepper">
            <div className="stepper-line">
              <div 
                className="stepper-line-progress" 
                style={{ height: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <div key={step.id} className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="step-badge">
                    {isCompleted ? '✓' : step.id + 1}
                  </div>
                  <div className="step-info">
                    <span className="step-name">{step.label}</span>
                    <span className="step-desc">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Clock size={14} className="animate-spin" />
            <span>This workflow typically takes 20-40 seconds.</span>
          </div>
        </div>
      )}

      {/* Error Card */}
      {error && (
        <div className="error-card">
          <AlertCircle size={20} />
          <div>
            <div className="error-title">Research Pipeline Terminated</div>
            <div className="error-text">{error}</div>
            <button 
              onClick={() => setError(null)} 
              className="generate-button" 
              style={{ marginTop: '1rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              Reset Terminal
            </button>
          </div>
        </div>
      )}

      {/* Workspace Dashboard */}
      {result && !loading && (
        <div className="workspace-container">
          
          {/* Left panel: Generated Article */}
          <div className="workspace-panel">
            <div className="panel-header">
              <div className="panel-title">
                <BookOpenCheck size={18} style={{ color: 'var(--accent-primary)' }} />
                <span>Editorial Manuscript</span>
              </div>
              <button 
                className="tab-btn" 
                onClick={() => {
                  setResult(null);
                  setTopic('');
                }}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
              >
                New Research
              </button>
            </div>
            <div className="panel-body">
              <article className="article-reader">
                {renderMarkdown(result.article)}
              </article>
            </div>
          </div>

          {/* Right panel: Details & Analytics tabs */}
          <div className="workspace-panel">
            <div className="panel-header">
              <div className="tab-list">
                <button 
                  className={`tab-btn ${activeTab === 'critique' ? 'active' : ''}`}
                  onClick={() => setActiveTab('critique')}
                >
                  <Award size={14} />
                  Critique
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'research' ? 'active' : ''}`}
                  onClick={() => setActiveTab('research')}
                >
                  <Compass size={14} />
                  Sources
                  <span className="badge-count">{parsedSources.length}</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'scraped' ? 'active' : ''}`}
                  onClick={() => setActiveTab('scraped')}
                >
                  <FileText size={14} />
                  Scraped Raw
                </button>
              </div>
            </div>
            
            <div className="panel-body">
              {/* Tab: Critique */}
              {activeTab === 'critique' && parsedCritique && (
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  
                  {/* Score Card Banner */}
                  <div className="critique-summary-card">
                    <div className="critique-score-gauge">
                      <svg className="critique-score-ring-svg" viewBox="0 0 36 36">
                        <path
                          style={{ stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 3 }}
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          style={{ 
                            stroke: getScoreColor(parsedCritique.score), 
                            strokeWidth: 3, 
                            strokeDasharray: `${parsedCritique.score * 10}, 100`,
                            strokeLinecap: 'round',
                            transition: 'stroke-dasharray 1s ease-out'
                          }}
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="critique-score-number">
                        {parsedCritique.score}
                        <span className="critique-score-label">/ 10</span>
                      </div>
                    </div>

                    <div className="critique-verdict-banner">
                      <div className="critique-verdict-title">Editorial Verdict</div>
                      <p className="critique-verdict-text">"{parsedCritique.verdict}"</p>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="critique-section-title strengths-title">
                    <CheckCircle2 size={16} />
                    Strengths
                  </div>
                  <ul className="critique-list">
                    {parsedCritique.strengths.map((str, idx) => (
                      <li key={idx} className="critique-item strength-item">
                        <CheckCircle2 size={14} style={{ marginTop: '0.1rem' }} />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Improvements */}
                  <div className="critique-section-title improvements-title">
                    <AlertTriangle size={16} />
                    Areas to Improve
                  </div>
                  <ul className="critique-list">
                    {parsedCritique.improvements.map((imp, idx) => (
                      <li key={idx} className="critique-item improve-item">
                        <AlertTriangle size={14} style={{ marginTop: '0.1rem' }} />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tab: Sources */}
              {activeTab === 'research' && (
                <div className="source-card-list" style={{ animation: 'slideUp 0.3s ease-out' }}>
                  {parsedSources.length > 0 ? (
                    parsedSources.map((src, idx) => (
                      <div key={idx} className="source-card">
                        <div className="source-title">{src.title}</div>
                        {src.url && (
                          <a href={src.url} target="_blank" rel="noopener noreferrer" className="source-url">
                            <Link size={12} />
                            {src.url}
                          </a>
                        )}
                        <p className="source-snippet">{src.snippet}</p>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                      No source results extracted.
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Scraped Raw */}
              {activeTab === 'scraped' && (
                <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Truncated Smart-Scrape Markdown Logs
                    </span>
                  </div>
                  <pre className="raw-code-box">
                    {result.scrape_result || "No raw text scraped."}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
