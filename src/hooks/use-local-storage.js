import { useRef, useState, useEffect, useCallback } from 'react';

import { safeGetItem, safeSetItem, safeRemoveItem } from 'src/utils/safe-storage';

// ----------------------------------------------------------------------

export function useLocalStorage(key, initialState) {
  const [state, setState] = useState(initialState);
  // Use ref to store latest initialState without causing re-renders
  const initialStateRef = useRef(initialState);

  // Update ref when initialState changes (but don't trigger effect)
  useEffect(() => {
    initialStateRef.current = initialState;
  }, [initialState]);

  useEffect(() => {
    const restored = getStorage(key);

    if (restored) {
      setState((prevValue) => ({
        ...prevValue,
        ...restored,
      }));
    } else {
      // Reset to initial state when key changes and no data is found
      setState(initialStateRef.current);
    }
  }, [key]);

  const updateState = useCallback(
    (updateValue) => {
      setState((prevValue) => {
        const newState = {
          ...prevValue,
          ...updateValue,
        };
        setStorage(key, newState);
        return newState;
      });
    },
    [key]
  );

  const update = useCallback(
    (name, updateValue) => {
      updateState({
        [name]: updateValue,
      });
    },
    [updateState]
  );

  const reset = useCallback(() => {
    removeStorage(key);
    setState(initialStateRef.current);
  }, [key]);

  return {
    state,
    update,
    reset,
  };
}

// ----------------------------------------------------------------------

export const getStorage = (key) => {
  try {
    return safeGetItem(key);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const setStorage = (key, value) => {
  try {
    safeSetItem(key, value);
  } catch (error) {
    console.error(error);
  }
};

export const removeStorage = (key) => {
  try {
    safeRemoveItem(key);
  } catch (error) {
    console.error(error);
  }
};
