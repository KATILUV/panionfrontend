// Simple audio effects for window operations

// Flag to check if browser supports Audio API
const isAudioSupported = typeof Audio !== 'undefined';

// Play sound when window snaps into position
export const playSnapSound = () => {
  if (!isAudioSupported) return;
  
  try {
    const audio = new Audio();
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbwAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqu3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7f////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQUAAAAAAAAAbwnxQQH/+MYxAAAAANIAAAAAExBTUUzLjEwMAJqIQAAAAAAAAAAWGluZwAAAA8AAAADAAACuACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC/+MYxFEAyplHiAGLMCKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    audio.volume = 0.3; // Keep volume subtle
    
    // Only play if the document has been interacted with
    if (document.hasFocus()) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(e => {
          // Silently fail - this is usually due to lack of user interaction
        });
      }
    }
  } catch (err) {
    // Silently fail
  }
};

// Play sound when window opens
export const playOpenSound = () => {
  if (!isAudioSupported) return;
  
  try {
    const audio = new Audio();
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAZAAZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGRkZGR3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d36Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo/////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAXIAAAAAAAAA/DaFWRyAAAAAAAAAAAAAAAAAAAAAP/jGMQAAAAAAkgAAAAATEFNRTMuMTAwAmpCAAAAAAAAAFhpbmcAAAAPAAAAAwAAAZAAycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnNzc3Nzc3Nzc3Nzc3Nzc3N/+MYxCYBKbZFkAGLMDc3Nzc3Nzc3Nzc3Nzc3Nzc3NzgAADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA';
    audio.volume = 0.3;
    
    // Only play if the document has been interacted with
    if (document.hasFocus()) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(e => {
          // Silently fail
        });
      }
    }
  } catch (err) {
    // Silently fail
  }
};

// Play sound when window closes
export const playCloseSound = () => {
  if (!isAudioSupported) return;
  
  try {
    const audio = new Audio();
    audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAZAAcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHCOjo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6OqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKio/////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAX4AAAAAAAAA8I94hhEAAAAAAAAAAAAAAAAAAAAAP/jGMQAAAAAAkgAAAAATEFNRTMuMTAwAmpCAAAAAAAAAFhpbmcAAAAPAAAAAwAAAZAA0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDW1tbW1tbW1tbW1tbW1tbW/+MYxCMA6VJFiAGLMNbW1tbW1tbW1tbW1tbW1tbW1tjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY';
    audio.volume = 0.3;
    
    // Only play if the document has been interacted with
    if (document.hasFocus()) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(e => {
          // Silently fail
        });
      }
    }
  } catch (err) {
    // Silently fail
  }
};