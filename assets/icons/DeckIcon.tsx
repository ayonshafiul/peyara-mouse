import * as React from 'react';
import Svg, {Rect, type SvgProps} from 'react-native-svg';

interface IconProps extends SvgProps {
  color?: string;
}

function DeckIcon(props: IconProps) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}>
      <Rect
        x={3}
        y={3}
        width={7}
        height={7}
        rx={1.5}
        stroke={props.color}
        strokeWidth={1.5}
      />
      <Rect
        x={14}
        y={3}
        width={7}
        height={7}
        rx={1.5}
        stroke={props.color}
        strokeWidth={1.5}
      />
      <Rect
        x={3}
        y={14}
        width={7}
        height={7}
        rx={1.5}
        stroke={props.color}
        strokeWidth={1.5}
      />
      <Rect
        x={14}
        y={14}
        width={7}
        height={7}
        rx={1.5}
        stroke={props.color}
        strokeWidth={1.5}
      />
    </Svg>
  );
}

export default DeckIcon;
