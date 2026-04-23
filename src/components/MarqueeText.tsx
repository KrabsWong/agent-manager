import { useRef, useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings';

interface MarqueeTextProps {
  text: string;
  className?: string;
}

// 滚动速度：每秒 100 像素
const SCROLL_SPEED_PX_PER_SECOND = 100;

export function MarqueeText({ text, className = '' }: MarqueeTextProps) {
  const { enableTitleMarquee } = useSettingsStore();
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldMarquee, setShouldMarquee] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [scrollDuration, setScrollDuration] = useState(0);

  // 检查文本是否超出容器
  const checkOverflow = useCallback(() => {
    if (!containerRef.current || !textRef.current) return;

    const container = containerRef.current;
    const textEl = textRef.current;
    const textWidth = textEl.scrollWidth;
    const containerWidth = container.clientWidth;
    const overflowAmount = textWidth - containerWidth;
    const isOverflowing = overflowAmount > 0;

    setShouldMarquee(isOverflowing);
    if (isOverflowing) {
      setScrollDistance(overflowAmount);
      // 根据滚动距离计算持续时间，保持恒定速度
      const duration = overflowAmount / SCROLL_SPEED_PX_PER_SECOND;
      setScrollDuration(Math.max(duration, 0.5)); // 最少 0.5 秒
    }
  }, []);

  useEffect(() => {
    if (!enableTitleMarquee) return;

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, enableTitleMarquee, checkOverflow]);

  const handleMouseEnter = () => {
    if (shouldMarquee && enableTitleMarquee) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  if (!enableTitleMarquee) {
    return <span className={`truncate ${className}`}>{text}</span>;
  }

  return (
    <span
      ref={containerRef}
      className={`relative block overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 渐变遮罩 - 右侧淡出效果 */}
      {shouldMarquee && !isHovering && (
        <span
          className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, transparent, var(--background, white))',
          }}
        />
      )}
      <span
        ref={textRef}
        className="block whitespace-nowrap"
        style={{
          transform: isHovering ? `translateX(-${scrollDistance}px)` : 'translateX(0)',
          transition: isHovering
            ? `transform ${scrollDuration}s linear`
            : 'transform 0.3s ease-out',
        }}
      >
        {text}
      </span>
    </span>
  );
}
