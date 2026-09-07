export const captionTransform = (translateY: number, isHero: boolean): string =>
  isHero ? `translate(-50%, calc(-50% + ${translateY}px))` : `translateY(${translateY}px)`;
