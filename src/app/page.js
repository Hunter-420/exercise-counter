'use client';

import React, { useState, useEffect, useRef } from "react";

const TOTAL_SETS = 15;
const REPS_PER_SET = 10;
const REST_BETWEEN_SETS = 4; // seconds
const REP_COUNTDOWN = 20; // seconds

const exercises = [
  { name: "Warm up", image: "/exercise1.jpg", restBetweenReps: 1 },
  { name: "Left Khutta uchalne", image: "/exercise2.jpg", restBetweenReps: 6 },
  { name: "Right khutta uchalne", image: "/exercise0.jpg", restBetweenReps: 10 },
  { name: "Duetai khutta uchalne", image: "/exercise3.jpg", restBetweenReps: 5 },
  { name: "Left Khutta tanne", image: "/exercise4.jpg", restBetweenReps: 5 },
  { name: "Right khutta tanne", image: "/exercise5.jpg", restBetweenReps: 10 },
  { name: "Pillow knee press", image: "/exercise6.jpg", restBetweenReps: 5 },
  { name: "Pillow ankel press", image: "/exercise7.jpg", restBetweenReps: 5 },
  { name: "Kammar uthaune", image: "/exercise8.jpg", restBetweenReps: 10 },
  { name: "Right khutta matra tekera kammar uchalne", image: "/exercise9.jpg", restBetweenReps: 12 },
  { name: "Pushup", image: "/exercise10.jpg", restBetweenReps: 5 },
  { name: "Right khutta bend up and down", image: "/exercise11.jpg", restBetweenReps: 1 },
  { name: "Right side fly", image: "/exercise12.jpg", restBetweenReps: 8 },
  { name: "Left side fly", image: "/exercise13.jpg", restBetweenReps: 8 },
  { name: "End", image: "/exercise14.jpg", restBetweenReps: 1 },
];

const phases = {
  IDLE: 'idle',
  REP: 'rep',
  REST_REP: 'rest_rep',
  REST_SET: 'rest_set',
};

export default function HipExerciseApp() {
  const [currentSet, setCurrentSet] = useState(0);
  const [currentRep, setCurrentRep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [phase, setPhase] = useState(phases.IDLE);
  const [remaining, setRemaining] = useState(0);
  const [history, setHistory] = useState([]);
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("");

  const timerRef = useRef(null);
  const isPausedRef = useRef(false);
  const hasResumedRef = useRef(false);
  const currentSetRef = useRef(currentSet);
  const currentRepRef = useRef(currentRep);
  const historyRef = useRef(history);

  useEffect(() => { currentSetRef.current = currentSet; }, [currentSet]);
  useEffect(() => { currentRepRef.current = currentRep; }, [currentRep]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // New useEffect: Speak exercise name automatically when exercise changes
  useEffect(() => {
    if (isRunning && phase === phases.IDLE) {
      speak(`Starting ${exercises[currentSet].name}`, 0.9);
    }
  }, [currentSet]);

  const saveHistory = (newHistory) => {
    const stringHistory = newHistory.filter(item => typeof item === 'string');
    setHistory(stringHistory);
    if (typeof window !== 'undefined') {
      localStorage.setItem("exerciseHistory", JSON.stringify(stringHistory));
    }
  };

  const speak = (text, rate = 1.0) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve();
    return new Promise(resolve => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.volume = 1.0;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      } catch (error) { resolve(); }
    });
  };

  const startRepCountdown = () => {
    setPhase(phases.REP);
    speak("Start", 1.0);
    setRemaining(REP_COUNTDOWN);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      setRemaining(prev => {
        const newVal = prev - 1;
        if (newVal > 0 && newVal <= 3) speak(newVal.toString(), 1.0);
        if (newVal <= 0) {
          clearInterval(timerRef.current);
          speak("Stop", 1.0).then(proceedAfterRep);
          return 0;
        }
        return newVal;
      });
    }, 1000);
  };

  const startRest = (duration, onComplete, isSetRest = false) => {
    const actualDuration = Math.max(1, duration);
    setPhase(isSetRest ? phases.REST_SET : phases.REST_REP);
    speak(`Rest for ${actualDuration} seconds`, 0.9);
    setRemaining(actualDuration);
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;

      setRemaining(prev => {
        const newVal = prev - 1;
        if (newVal > 0 && newVal <= 2) speak(newVal.toString(), 0.9);
        if (newVal <= 0) {
          clearInterval(timerRef.current);
          onComplete();
          return 0;
        }
        return newVal;
      });
    }, 1000);
  };

  const proceedAfterRep = () => {
    const newRep = currentRepRef.current + 1;

    if (newRep < REPS_PER_SET) {
      setCurrentRep(newRep);
      const rest = exercises[currentSetRef.current].restBetweenReps || 0;
      if (rest > 0) startRest(rest, startRepCountdown);
      else startRepCountdown();
    } else {
      const newHistory = [...historyRef.current, exercises[currentSetRef.current].name];
      saveHistory(newHistory);

      const nextSet = currentSetRef.current + 1;
      if (nextSet < TOTAL_SETS) {
        startRest(REST_BETWEEN_SETS, () => {
          setCurrentSet(nextSet);
          setCurrentRep(0);
            speak(`Starting ${exercises[nextSet].name}`, 0.9)
  .then(() => new Promise(res => setTimeout(res, 6000))) // wait 300ms after speaking
  .then(startRepCountdown);

        }, true);
      } else {
        speak("All exercises completed. Great job!", 0.9).then(() => {
          setIsRunning(false);
          setPhase(phases.IDLE);
          setCompleted(true);
        });
      }
    }
  };

  const startExercise = () => {
    if (phase === phases.IDLE) {
      if (currentRep === 0) {
        speak(`Starting ${exercises[currentSet].name}`, 0.9).then(startRepCountdown);
      } else startRepCountdown();
    }
  };

  const start = () => { setIsRunning(true); setIsPaused(false); hasResumedRef.current = true; if (phase === phases.IDLE) startExercise(); };
  const pause = () => { setIsPaused(true); speak("Paused", 1.0); };
  const resume = () => { setIsPaused(false); hasResumedRef.current = true; speak("Resuming", 1.0); };

  const redoSet = () => {
    clearInterval(timerRef.current);
    setPhase(phases.IDLE); setRemaining(0); setCurrentRep(0);
    setIsRunning(false); setIsPaused(false); hasResumedRef.current = false;
    speak(`Redoing ${exercises[currentSet].name}`, 0.9);
  };

  const nextSet = () => {
    clearInterval(timerRef.current);
    setPhase(phases.IDLE); setRemaining(0);
    setCurrentSet(prev => Math.min(prev + 1, TOTAL_SETS - 1));
    setCurrentRep(0); setIsRunning(false); setIsPaused(false); hasResumedRef.current = false;
  };

  const prevSet = () => {
    clearInterval(timerRef.current);
    setPhase(phases.IDLE); setRemaining(0);
    setCurrentSet(prev => Math.max(prev - 1, 0));
    setCurrentRep(0); setIsRunning(false); setIsPaused(false); hasResumedRef.current = false;
  };

  const restart = () => {
    clearInterval(timerRef.current);
    setPhase(phases.IDLE); setRemaining(0); setCurrentSet(0); setCurrentRep(0);
    setIsRunning(false); setIsPaused(false); setCompleted(false); hasResumedRef.current = false;
    saveHistory([]);
    speak("Workout restarted", 0.9);
  };

  const calculateTotalRemainingSeconds = () => {
    if (completed) return 0;
    let totalRemaining = 0;
    let currentEffective = currentSet;
    let remainingInSet = 0;

    if (phase === phases.REST_SET) {
      totalRemaining += remaining;
      currentEffective = currentSet + 1;
      const restRepNext = exercises[currentEffective]?.restBetweenReps || 0;
      remainingInSet = REPS_PER_SET * REP_COUNTDOWN + (REPS_PER_SET - 1) * restRepNext;
    } else {
      const restRep = exercises[currentEffective]?.restBetweenReps || 0;
      if (phase === phases.REP) {
        remainingInSet = remaining + (REPS_PER_SET - (currentRep + 1)) * (REP_COUNTDOWN + restRep);
      } else if (phase === phases.REST_REP) {
        remainingInSet = remaining + (REPS_PER_SET - currentRep - 1) * REP_COUNTDOWN + (REPS_PER_SET - currentRep - 1) * restRep;
      } else {
        remainingInSet = (REPS_PER_SET - currentRep) * REP_COUNTDOWN + (REPS_PER_SET - currentRep - 1) * restRep;
      }
    }

    totalRemaining += remainingInSet;

    for (let i = currentEffective + 1; i < TOTAL_SETS; i++) {
      const setRestRep = exercises[i].restBetweenReps || 0;
      totalRemaining += REPS_PER_SET * REP_COUNTDOWN + (REPS_PER_SET - 1) * setRestRep;
    }

    const remainingSetsIncludingCurrent = TOTAL_SETS - currentEffective;
    const numRemainingRests = Math.max(remainingSetsIncludingCurrent - 1, 0);
    totalRemaining += numRemainingRests * REST_BETWEEN_SETS;

    return totalRemaining;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalRemainingSeconds = calculateTotalRemainingSeconds();
  const progressPercentage = (history.length / TOTAL_SETS) * 100;
  const displayRep = currentRep + 1;
  const repProgressPercentage = phase === phases.REP ? (1 - (remaining / REP_COUNTDOWN)) * 100 : 0;

  const renderRemaining = () => {
    if (phase === phases.REP) return `Exercise: ${remaining} seconds remaining`;
    if (phase === phases.REST_REP) return `Rest between reps: ${remaining} seconds remaining`;
    if (phase === phases.REST_SET) return `Rest between sets: ${remaining} seconds remaining`;
    return isRunning ? "Ready to continue" : "Press Start to begin";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 flex flex-col items-center justify-between p-4 text-white">
      <h1 className="text-2xl font-bold mt-4">Hip Rehab Trainer</h1>

      {completed ? (
        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-sm mt-4 text-center">
          <h2 className="text-lg font-semibold">All Exercises Completed</h2>
          <p className="text-xl font-bold mt-2">Great job!</p>
        </div>
      ) : (
        <div className="bg-white text-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-sm mt-4">
          <h2 className="text-lg font-semibold text-center">{exercises[currentSet].name}</h2>
          <img
            src={exercises[currentSet].image}
            alt={exercises[currentSet].name}
            className="mx-auto my-4 w-40 h-40 rounded-lg border object-cover bg-gray-100"
            onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' fill='%23eeeeee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999999'%3EExercise Photo%3C/text%3E%3C/svg%3E"; }}
          />
          <div className="flex justify-between items-center mb-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Progress</div>
              <div className="text-lg font-bold">{Math.round(progressPercentage)}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Remaining</div>
              <div className="text-lg font-bold">{formatTime(totalRemainingSeconds)}</div>
            </div>
          </div>
          <p className="text-center text-lg">Set {currentSet + 1} of {TOTAL_SETS}</p>
          <p className="text-center text-xl font-bold mt-2">Rep {displayRep} of {REPS_PER_SET}</p>
          {phase === phases.REP && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${repProgressPercentage}%` }}></div>
            </div>
          )}
          <p className="text-center text-sm mt-2">{renderRemaining()}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {!completed && (
          <>
            {!isRunning ? (
              <button className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={start}>▶ Start</button>
            ) : isPaused ? (
              <button className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={resume}>▶ Resume</button>
            ) : (
              <button className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={pause}>⏸ Pause</button>
            )}

            <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={redoSet}>🔄 Redo Set</button>
            <button className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={prevSet} disabled={currentSet === 0}>⬅ Previous</button>
            <button className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={nextSet} disabled={currentSet === TOTAL_SETS - 1}>Next ➡</button>
          </>
        )}
        <button className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl font-semibold transition-colors" onClick={restart}>⏮ Restart All</button>
      </div>

      <div className="bg-white text-gray-900 rounded-xl shadow-lg p-4 mt-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-2">Completed Sets</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No sets completed yet</p>
        ) : (
          <ul className="max-h-40 overflow-y-auto text-sm">
            {history.map((setName, i) => (
              <li key={i} className="py-1 border-b border-gray-100">✅ {setName}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

