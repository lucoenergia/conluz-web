import type { FC } from "react";
import type { SvgIconComponent } from '@mui/icons-material';

interface LabeledIconProps {
  icon: SvgIconComponent,
  iconPosition?: 'left' | 'right'
  justify?: 'start' | 'end' | 'between'
  label: string
  variant?: 'normal' | 'compact'
  labelSize?: 'text-sm' | 'text-base' | 'text-lg' | 'text-xl' |'text-2xl'
}

const contentJustification = {
  start: "justify-start",
  end: "justify-end",
  between: "justify-between"
}

export const LabeledIcon: FC<LabeledIconProps> = ({ label, icon: Icon, iconPosition='left', justify='start', variant='normal', labelSize }) => {
  return <div className={`grid grid-flow-col w-full ${contentJustification[justify]} gap-2 ${variant === 'compact' ? '' : 'p-2'}`}>
    { iconPosition==='left' && <Icon/> }
    <span className={labelSize ?? 'text-base'}>{ label }</span>
    { iconPosition==='right' && <Icon/> }
  </div>
}




