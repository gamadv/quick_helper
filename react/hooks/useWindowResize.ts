import { useState, useEffect } from "react";

type useWindowSizeProps = {
  width: number;
  height: number;
};

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState<useWindowSizeProps>();
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return windowSize;
}
