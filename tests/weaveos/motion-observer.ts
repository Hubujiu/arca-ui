import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'
export type Box={x:number;y:number;width:number;height:number}

// Observe before the interaction, including the first committed layout. Sampling
// cannot infer the expected origin from the component's own geometry function.
export async function armGeometry(page:Page){
 await page.evaluate(()=>{
  type Capture={values:{x:number;y:number;width:number;height:number}[];stop:()=>void}
  const host=window as typeof window&{weaveGeometry?:Capture}
  host.weaveGeometry?.stop()
  const values:Capture['values']=[]
  let frame=0,active=true
  const sample=()=>{const el=document.querySelector('[role="dialog"]');if(el){const b=el.getBoundingClientRect();if(b.width>0&&b.height>0)values.push({x:b.x,y:b.y,width:b.width,height:b.height})}}
  const observer=new MutationObserver(sample)
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']})
  const tick=()=>{sample();if(active)frame=requestAnimationFrame(tick)}
  tick()
  host.weaveGeometry={values,stop:()=>{active=false;cancelAnimationFrame(frame);observer.disconnect()}}
 })
}
export async function finishGeometry(page:Page):Promise<Box[]>{
 return page.evaluate(()=>{
  const capture=(window as typeof window&{weaveGeometry?:{values:{x:number;y:number;width:number;height:number}[];stop:()=>void}}).weaveGeometry
  if(!capture)throw new Error('geometry observation was not armed')
  capture.stop();return capture.values
 })
}
export function expectOrigin(samples:Box[],source:Box){
 expect(samples.length,'actual rendered geometry samples').toBeGreaterThan(0)
 const near=samples.some(b=>Math.abs(b.x-source.x)<=6&&Math.abs(b.y-source.y)<=6&&Math.abs(b.width-source.width)<=6&&Math.abs(b.height-source.height)<=6)
 expect(near,`window must visit actual source bounds ${JSON.stringify(source)}; first=${JSON.stringify(samples[0])}; last=${JSON.stringify(samples.at(-1))}`).toBe(true)
}
export function expectStationary(samples:Box[],target:Box){
 expect(samples.length,'reduced-motion transition must actually be observed').toBeGreaterThan(0)
 for(const b of samples){
  expect(Math.abs(b.x-target.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(b.y-target.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(b.width-target.width)).toBeLessThanOrEqual(1)
  expect(Math.abs(b.height-target.height)).toBeLessThanOrEqual(1)
 }
}
