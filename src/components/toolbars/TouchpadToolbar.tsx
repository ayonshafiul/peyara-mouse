import React from 'react';
import QuickTuneRow, {type TuneValues} from '../QuickTuneRow';

interface TouchpadToolbarProps {
  values: TuneValues;
  onChange: (values: TuneValues) => void;
}

export default function TouchpadToolbar({values, onChange}: TouchpadToolbarProps) {
  return <QuickTuneRow values={values} onChange={onChange} />;
}
