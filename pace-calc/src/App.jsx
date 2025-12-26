import { useState } from 'react';
import './App.css';

function App() {
  // --- STATE MANAGEMENT ---
  
  // 'calculatePace' = User enters Time -> We calc Pace
  // 'calculateTime' = User enters Pace -> We calc Total Time
  const [calcMode, setCalcMode] = useState('calculatePace');

  // Shared Inputs
  const [eventType, setEventType] = useState('custom');
  const [distance, setDistance] = useState(''); 
  const [unit, setUnit] = useState('mi'); 

  // Mode Specific Inputs
  const [paceMins, setPaceMins] = useState(8);
  const [paceSecs, setPaceSecs] = useState(0);
  
  const [hrs, setHrs] = useState('');
  const [mins, setMins] = useState(0);
  const [secs, setSecs] = useState(0);

  // Results State
  const [results, setResults] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // --- HELPERS ---

  const formatTime = (totalSeconds) => {
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = Math.round(totalSeconds % 60);

    if (s === 60) { s = 0; m++; }
    if (m === 60) { m = 0; h++; }

    const minStr = m < 10 && h > 0 ? "0" + m : m;
    const secStr = s < 10 ? "0" + s : s;

    if (h > 0) return `${h}:${minStr}:${secStr}`;
    return `${m}:${secStr}`;
  };

  const handleEventChange = (e) => {
    const val = e.target.value;
    setEventType(val);
    
    if (val !== 'custom') {
      setDistance(parseFloat(val));
      setUnit('km'); 
    } else {
      setDistance('');
      setUnit('mi');
    }
  };

  const handleCopy = async () => {
    if (!results) return;

    let text = `Pace Calculator Results\n`;
    text += `${results.mainLabel}: ${results.mainMetric}\n`;
    text += `Strategy: Negative Split\n\n`;
    text += `Mile | Pace  | Elapsed\n`;
    text += `----------------------\n`;

    results.splits.forEach(row => {
      text += `${row.label.padEnd(4)} | ${row.pace.padEnd(5)} | ${row.elapsed}\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // --- CALCULATION LOGIC ---

  const handleCalculate = () => {
    setIsCopied(false);
    
    // 1. Validate Distance
    const dInput = parseFloat(distance);
    if (!dInput || dInput <= 0) {
      alert("Please enter a valid distance");
      return;
    }

    // Convert distance to Miles
    const totalMiles = unit === 'km' ? dInput * 0.621371 : dInput;

    let avgSecondsPerMile = 0;
    let totalDurationSeconds = 0;

    // --- MODE A: User enters TIME -> Calculate PACE ---
    if (calcMode === 'calculatePace') {
      const hInput = parseInt(hrs) || 0;
      const mInput = parseInt(mins) || 0;
      const sInput = parseInt(secs) || 0;
      totalDurationSeconds = (hInput * 3600) + (mInput * 60) + sInput;

      if (totalDurationSeconds === 0) {
        alert("Please enter a goal time");
        return;
      }

      avgSecondsPerMile = totalDurationSeconds / totalMiles;
    } 
    
    // --- MODE B: User enters PACE -> Calculate TIME ---
    else {
      const pMins = parseInt(paceMins) || 0;
      const pSecs = parseInt(paceSecs) || 0;
      
      if (pMins === 0 && pSecs === 0) {
        alert("Please enter a target pace");
        return;
      }

      avgSecondsPerMile = (pMins * 60) + pSecs;
      totalDurationSeconds = avgSecondsPerMile * totalMiles;
    }

    // --- GENERATE SPLITS ---
    const cutdown = 5; 
    const fullMiles = Math.floor(totalMiles);
    const partialMile = totalMiles - fullMiles;

    let currentPaceSeconds = avgSecondsPerMile + ((totalMiles * cutdown) / 2);

    let accumulatedSeconds = 0;
    const newSplits = [];

    for (let i = 1; i <= fullMiles; i++) {
      let splitTime = currentPaceSeconds;
      accumulatedSeconds += splitTime;

      newSplits.push({
        label: i.toString(),
        pace: formatTime(splitTime),
        elapsed: formatTime(accumulatedSeconds)
      });

      currentPaceSeconds -= cutdown;
    }

    if (partialMile > 0.01) {
      let partialTime = currentPaceSeconds * partialMile;
      accumulatedSeconds += partialTime;
      
      newSplits.push({
        label: `${fullMiles + 1} (${partialMile.toFixed(2)})`,
        pace: formatTime(currentPaceSeconds),
        elapsed: formatTime(accumulatedSeconds)
      });
    }

    setResults({
      mainMetric: calcMode === 'calculatePace' 
        ? formatTime(avgSecondsPerMile)
        : formatTime(totalDurationSeconds), 
      mainLabel: calcMode === 'calculatePace' 
        ? "Average Pace Required" 
        : "Total Estimated Time",
      subLabel: calcMode === 'calculatePace' 
        ? "per mile" 
        : `at ${formatTime(avgSecondsPerMile)}/mi avg`,
      splits: newSplits
    });
  };

  return (
    <div className="calculator-card">
      <h2>Pace Calculator</h2>

      <div className="mode-toggle">
        <button 
          className={calcMode === 'calculatePace' ? 'active' : ''}
          onClick={() => setCalcMode('calculatePace')}
        >
          I Know My Time
        </button>
        <button 
          className={calcMode === 'calculateTime' ? 'active' : ''}
          onClick={() => setCalcMode('calculateTime')}
        >
          I Know My Pace
        </button>
      </div>

      <div className="form-group">
        <label>Event / Distance</label>
        <select value={eventType} onChange={handleEventChange}>
          <option value="custom">Custom Distance</option>
          <option value="5">5K</option>
          <option value="10">10K</option>
          <option value="21.0975">Half Marathon</option>
          <option value="42.195">Marathon</option>
        </select>
        
        <div className="unit-toggle">
          <input 
            type="number" 
            inputMode="decimal" // Triggers decimal keyboard
            value={distance} 
            onChange={(e) => setDistance(e.target.value)} 
            step="0.01" 
            placeholder="Distance"
          />
          <select 
            value={unit} 
            onChange={(e) => setUnit(e.target.value)} 
            style={{ width: '80px' }}
          >
            <option value="mi">mi</option>
            <option value="km">km</option>
          </select>
        </div>
      </div>

      {calcMode === 'calculatePace' && (
        <div className="form-group">
          <label>Goal Time (Hr : Min : Sec)</label>
          <div className="time-inputs">
            <div className="time-field">
              <input 
                type="number" 
                inputMode="numeric" 
                placeholder="00" 
                value={hrs} 
                onChange={(e) => setHrs(e.target.value)} 
              />
            </div>
            <div className="time-separator">:</div>
            <div className="time-field">
              <input 
                type="number" 
                inputMode="numeric" 
                placeholder="00" 
                value={mins} 
                onChange={(e) => setMins(e.target.value)} 
              />
            </div>
            <div className="time-separator">:</div>
            <div className="time-field">
              <input 
                type="number" 
                inputMode="numeric" 
                placeholder="00" 
                value={secs} 
                onChange={(e) => setSecs(e.target.value)} 
              />
            </div>
          </div>
        </div>
      )}

      {calcMode === 'calculateTime' && (
        <div className="form-group">
          <label>Desired Average Pace (min/mi)</label>
          <div className="time-inputs">
            <div className="time-field">
              <input 
                type="number" 
                inputMode="numeric" 
                value={paceMins} 
                onChange={(e) => setPaceMins(e.target.value)} 
                placeholder="8"
              />
            </div>
            <div className="time-separator">:</div>
            <div className="time-field">
              <input 
                type="number" 
                inputMode="numeric" 
                value={paceSecs} 
                onChange={(e) => setPaceSecs(e.target.value)} 
                placeholder="00"
              />
            </div>
          </div>
        </div>
      )}

      <button className="calculate-btn" onClick={handleCalculate}>
        {calcMode === 'calculatePace' ? 'Calculate Pace' : 'Calculate Time'}
      </button>

      {results && (
        <div className="results">
          <div style={{ position: 'relative' }}>
            <button 
              onClick={handleCopy}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                padding: '5px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: isCopied ? '#2ecc71' : 'white',
                color: isCopied ? 'white' : '#333',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 10
              }}
            >
              {isCopied ? 'Copied!' : 'Copy Splits'}
            </button>

            <div className="result-summary">
              <span className="sub-label">{results.mainLabel}</span>
              <span className="main-pace">{results.mainMetric}</span>
              <span className="sub-label">{results.subLabel}</span>
            </div>
          </div>

          <h3>Negative Split Strategy</h3>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>
            Strategy: Start ~2.5s slower, finish ~2.5s faster than avg
          </p>

          <table>
            <thead>
              <tr>
                <th>Mile</th>
                <th>Split Pace</th>
                <th>Elapsed Time</th>
              </tr>
            </thead>
            <tbody>
              {results.splits.map((row, index) => (
                <tr key={index}>
                  <td>{row.label}</td>
                  <td className="negative-trend">{row.pace}</td>
                  <td>{row.elapsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;