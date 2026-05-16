import React from 'react';
export type PokeBallIconProps = {size?:number; thickness?:number; color?:any, [key:string]:any};
const PokeBallIcon :React.FC<PokeBallIconProps> = (props: PokeBallIconProps) => {
  if(!props.size){
    props = {
      ...props,
      height:"100%",
      width:"100%",
      size:1,
      viewBox:`0 0 1 1`,
    }
  }
  else{
    props = {
      ...props,
      height:props.size,
      width:props.size,
    }
  }
  const size = props.size ?? 1;
  const thickness = props.thickness ?? (size/10);
  const color = props.color ?? "red";
  const outer_radius = ((size-thickness)/2);
  const inner_radius = outer_radius/3
  return (<svg {...props}>
    <circle r={outer_radius} cx={size/2} cy={size/2} fill="none" strokeWidth={thickness} stroke={color}/>
    <circle r={inner_radius} cx={size/2} cy={size/2} fill="none" strokeWidth={thickness} stroke={color}/>
    <line y1={size/2} y2={size/2} x1={(size/2)-inner_radius} x2={(size/2)-outer_radius} strokeWidth={thickness} stroke={color}/>
    <line y1={size/2} y2={size/2} x1={(size/2)+inner_radius} x2={(size/2)+outer_radius} strokeWidth={thickness} stroke={color}/>
  </svg>)
};
export default PokeBallIcon;


