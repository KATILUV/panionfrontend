// This script checks the localStorage values in the browser context
console.log("Checking localStorage values for taskbar...");
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'localStorage') {
    console.log(event.data.value);
  }
});
document.dispatchEvent(new CustomEvent('checkLocalStorage', {
  detail: {
    key: 'panion-taskbar-store'
  }
}));
