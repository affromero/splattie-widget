import { createElement, useRef, useEffect, forwardRef, type HTMLAttributes } from 'react';

import './index';

export interface SplattieWidgetProps extends HTMLAttributes<HTMLElement> {
  src?: string;
  background?: string;
  width?: string;
  height?: string;
  onSplatLoad?: () => void;
  onSplatHover?: () => void;
  onSplatClick?: () => void;
  onSplatLeave?: () => void;
}

export const SplattieWidget = forwardRef<HTMLElement, SplattieWidgetProps>(
  function SplattieWidget(
    { src, background, width, height, onSplatLoad, onSplatHover, onSplatClick, onSplatLeave, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLElement>(null);
    const elRef = (ref ?? innerRef) as React.RefObject<HTMLElement>;

    useEffect(() => {
      const el = elRef.current;
      if (!el) return;
      const pairs: [string, () => void][] = [];
      if (onSplatLoad) pairs.push(['splatload', onSplatLoad]);
      if (onSplatHover) pairs.push(['splathover', onSplatHover]);
      if (onSplatClick) pairs.push(['splatclick', onSplatClick]);
      if (onSplatLeave) pairs.push(['splatleave', onSplatLeave]);
      for (const [ev, fn] of pairs) el.addEventListener(ev, fn);
      return () => { for (const [ev, fn] of pairs) el.removeEventListener(ev, fn); };
    }, [onSplatLoad, onSplatHover, onSplatClick, onSplatLeave]);

    return createElement('splattie-widget', { ref: elRef, src, background, width, height, ...rest });
  },
);
