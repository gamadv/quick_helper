import React, { memo, useMemo } from 'react';
import { icons, IIcon } from './icons';

export type TIconName = keyof typeof icons;

export interface IIconProps extends Omit<IIcon, 'iconSize'> {
  name: TIconName;
  size?: IIcon['iconSize'];
  color?: IIcon['iconColor'];
}

const IconComponent: React.FC<IIconProps> = ({ name, size, color, ...props }) => {
  const Component = useMemo(() => icons[name], [name]);

  return <Component iconSize={size} iconColor={color} {...props} />;
};

export const Icon = memo(IconComponent);
