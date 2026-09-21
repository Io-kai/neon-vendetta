import { StoryBeat } from "./story";
const lines=[{"intro": "Korvo's dead, the lights are back\u2014but Vesper Row still owns the district's real key.", "outro": "Sable's blades are down. The access key's ours. Now find what it opens."}, {"intro": "The key leads to Ash Canal\u2014cooling lines feeding a tower that shouldn't need this much power.", "outro": "Cinder's back in the water. The cooling line traces straight up to Glass Spire."}, {"intro": "Glass Spire. One switch up top decides who gets to flip this city's lights off again.", "outro": "Orison's down. The switch is public now\u2014nobody owns the dark alone."}];
export function campaignBeat(index:number,exit:boolean,hero:string):StoryBeat {
 const names=['VESPER ROW','ASH CANAL','GLASS SPIRE'];
 const visuals=['club','canal','spire'];
 return {id:`campaign-${index}-${exit}`,title:names[index-1],cinematic:true,pages:[{
 speaker:hero.toUpperCase(),text:lines[index-1][exit?'outro':'intro'],portrait:hero,
 visual:`${visuals[index-1]}${exit?'-exit':''}`,seconds:5}]};
}
