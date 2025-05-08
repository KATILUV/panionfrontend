// Add a utility to help with zustand subscriptions when using selectors
// This is a simplified version of similar functionality in zustand

/**
 * Helper function to set up a subscription with a selector
 * @param store The zustand store
 * @param selector Function to select a slice of the store state
 * @param listener Function called when the selected state changes
 * @returns Unsubscribe function
 */
export function subscribeWithSelector<T, U>(
  store: {
    getState: () => T;
    subscribe: (listener: (state: T) => void) => () => void;
  },
  selector: (state: T) => U,
  listener: (selectedState: U) => void
): () => void {
  let currentSlice = selector(store.getState());
  
  return store.subscribe((state) => {
    const nextSlice = selector(state);
    if (nextSlice !== currentSlice) {
      listener(nextSlice);
      currentSlice = nextSlice;
    }
  });
}