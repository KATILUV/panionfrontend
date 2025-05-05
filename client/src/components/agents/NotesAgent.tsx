import React, { useState, useEffect } from 'react';

const NotesAgent: React.FC = () => {
  const [notes, setNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  
  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem('panion-notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to parse saved notes:', e);
      }
    }
  }, []);
  
  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem('panion-notes', JSON.stringify(notes));
  }, [notes]);
  
  const handleAddNote = () => {
    if (currentNote.trim()) {
      setNotes([...notes, currentNote]);
      setCurrentNote('');
    }
  };
  
  const handleDeleteNote = (index: number) => {
    const newNotes = [...notes];
    newNotes.splice(index, 1);
    setNotes(newNotes);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };
  
  return (
    <div className="h-full flex flex-col p-4 text-white">
      <h2 className="h2 text-primary mb-4">Quick Notes</h2>
      
      <div className="flex-1 overflow-auto space-y-2 mb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {notes.length === 0 ? (
          <div className="window-panel flex items-center justify-center py-8 text-white/50 text-center">
            No notes yet. Add one below!
          </div>
        ) : (
          <>
            {notes.map((note, index) => (
              <div 
                key={index}
                className="window-panel break-words relative group hover:bg-white/[0.15] transition-colors duration-200"
              >
                <p className="pr-6 text-content">{note}</p>
                <button
                  onClick={() => handleDeleteNote(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/70 hover:text-red-400"
                  aria-label="Delete note"
                >
                  ×
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      
      <div className="window-panel overflow-hidden">
        <textarea
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a new note..."
          className="w-full p-3 bg-transparent text-white border-none outline-none resize-none focus:ring-0"
          rows={3}
        />
        <div className="flex justify-end p-2 border-t border-white/10">
          <button
            onClick={handleAddNote}
            disabled={!currentNote.trim()}
            className={`px-4 py-1.5 rounded-md transition-colors text-sm shadow-sm ${
              currentNote.trim() 
                ? 'bg-primary hover:bg-primary-hover text-primary-foreground' 
                : 'bg-white/10 text-white/30'
            }`}
          >
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesAgent;