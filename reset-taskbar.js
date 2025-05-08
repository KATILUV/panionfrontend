// Script to reset the taskbar to default settings (removing database and brain-circuit)
// This directly resets the localStorage where the taskbar state is stored

try {
  // Get the taskbar store from localStorage
  localStorage.removeItem('panion-taskbar-store');
  console.log('Successfully reset taskbar to default settings (without database and brain-circuit)');
} catch (error) {
  console.error('Error resetting taskbar:', error);
}
