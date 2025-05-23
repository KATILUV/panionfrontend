import React, { useState, useEffect } from 'react';
import { WindowPanel, WindowContent, WindowSection, windowTextStyles } from '../ui/window-components';

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
    <WindowPanel 
      title="Quick Notes" 
      fullHeight 
      className="flex flex-col h-full"
    >
      <WindowContent
        variant="ghost"
        padding="none"
        className="flex-1 space-y-2 mb-4" 
        withScroll
      >
        {notes.length === 0 ? (
          <WindowContent
            className="flex items-center justify-center py-8 text-center"
            textColor="muted"
          >
            <p className={windowTextStyles.muted}>No notes yet. Add one below!</p>
          </WindowContent>
        ) : (
          <>
            {notes.map((note, index) => (
              <WindowContent
                key={index}
                variant="default"
                className="break-words relative group hover:bg-white/[0.15] transition-colors duration-200"
              >
                <p className={`pr-6 ${windowTextStyles.default}`}>{note}</p>
                <button
                  onClick={() => handleDeleteNote(index)}
                  className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-white/70 hover:text-red-400 touch-manipulation"
                  aria-label="Delete note"
                  style={{ fontSize: '1.25rem' }}
                >
                  ×
                </button>
              </WindowContent>
            ))}
          </>
        )}
      </WindowContent>
      
      <WindowContent className="overflow-hidden">
        <textarea
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a new note..."
          className={`w-full p-3 bg-transparent border-none outline-none resize-none focus:ring-0 ${windowTextStyles.bright} touch-manipulation`}
          rows={3}
          style={{ fontSize: window.matchMedia('(max-width: 640px)').matches ? '16px' : 'inherit' }}
        />
        <div className="flex justify-end p-2 border-t border-white/10">
          <button
            onClick={handleAddNote}
            disabled={!currentNote.trim()}
            className={`px-4 py-2 md:py-1.5 rounded-md transition-colors text-sm shadow-sm ${
              currentNote.trim() 
                ? 'bg-primary hover:bg-primary-hover text-primary-foreground' 
                : 'bg-white/10 text-white/30'
            }`}
          >
            Add Note
          </button>
        </div>
      </WindowContent>
    </WindowPanel>
  );
};

export default NotesAgent;