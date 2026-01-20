import { useState } from "react";
import { Search, Sparkles, ChevronRight } from "lucide-react";
import "./CodeSearch.css";

const DUMMY_BACKEND_RESULTS = [
  {
    title: "Type 2 Diabetes Mellitus",
    description:
      "A form of diabetes mellitus characterized by insulin resistance and relative insulin deficiency.",
    codes: [
      { system: "NAMASTE", code: "N456" },
      { system: "ICD11_TM2", code: "TM2-999" },
      { system: "ICD11_BIOMED", code: "5A11" }
    ],
    confidence: 0.95
  }
];

export default function CodeSearch() {
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [system, setSystem] = useState("ALL");
  const [minConfidence, setMinConfidence] = useState(0.9);
  const [onlyActive, setOnlyActive] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const runSearch = () => {
    // dummy backend simulation
    setResults(DUMMY_BACKEND_RESULTS);
    setSearched(true);
  };

  const runAISearch = () => {
    if (!aiQuery.trim()) return;
    setQuery(aiQuery);
    runSearch();
  };

  return (
    <div className="code-search-shell">
      <div className="code-search">
        <h1>Code Search</h1>

        {/* MAIN SEARCH */}
        <div className="search-row">
          <div className="search-input">
            <Search />
            <input
              type="text"
              placeholder="Search by disease name, concept code, or keyword"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            value={system}
            onChange={(e) => setSystem(e.target.value)}
          >
            <option value="ALL">All Systems</option>
            <option value="NAMASTE">NAMASTE</option>
            <option value="ICD11_TM2">ICD11_TM2</option>
            <option value="ICD11_BIOMED">ICD11_BIOMED</option>
          </select>
        </div>

        {/* AI SEARCH */}
        <div className="ai-row">
          <Sparkles />
          <input
            type="text"
            placeholder="AI search (describe symptoms or condition)"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          <button type="button" onClick={runAISearch}>
            Ask AI
          </button>
        </div>

        {/* FILTERS */}
        <div className="filters">
          <label htmlFor="onlyActive">
            <input
              id="onlyActive"
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Only active concepts
          </label>

          <label htmlFor="minConfidence">
            <span>Minimum confidence:</span>
            <input
              id="minConfidence"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
            />
          </label>

          <button
            type="button"
            className="primary"
            onClick={runSearch}
          >
            Search
          </button>
        </div>

        {/* RESULTS */}
        {searched && (
          <div className="results">
            <h2>Search Results</h2>

            {results.map((r, i) => (
              <div className="result" key={i}>
                <div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>

                  <div className="tags">
                    {r.codes.map((c, j) => (
                      <span key={j} className={`tag ${c.system}`}>
                        {c.system}: {c.code}
                      </span>
                    ))}
                    <span className="tag confidence">
                      Confidence: {r.confidence.toFixed(2)}
                    </span>
                  </div>
                </div>

                <ChevronRight />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
