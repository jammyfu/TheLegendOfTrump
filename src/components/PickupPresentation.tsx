import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { game } from '../game/simulation';
import { PICKUP_DURATION, pickupEnvelope } from '../game/pickup';
import { applyLegendMaterials } from '../game/materials';

export function PickupPresentation() {
  // Same loader keys as equipped gear: reuse the already loaded GLBs.
  const sword = useLoader(GLTFLoader, import.meta.env.BASE_URL+'models/hero-sword.glb');
  const shield = useLoader(GLTFLoader, import.meta.env.BASE_URL+'models/hero-shield.glb');
  const bow = useLoader(GLTFLoader, import.meta.env.BASE_URL+'models/adventure-bow.glb');
  const woodSword = useLoader(GLTFLoader, import.meta.env.BASE_URL+'models/wood-sword.glb');
  const woodShield = useLoader(GLTFLoader, import.meta.env.BASE_URL+'models/wood-shield.glb');
  const root = useRef<Group>(null);
  const models = useMemo(() => [sword, shield, bow, woodSword, woodShield].map(source => {
    const object = source.scene.clone(true);
    applyLegendMaterials(object);
    const bounds = new Box3().setFromObject(object);
    const size = bounds.getSize(new Vector3());
    object.position.sub(bounds.getCenter(new Vector3()));
    const holder = new Group(); holder.add(object);
    holder.scale.setScalar(1.05/Math.max(size.x,size.y,size.z));
    return holder;
  }), [sword,shield,bow,woodSword,woodShield]);
  useFrame(() => {
    if (!root.current) return;
    root.current.visible = game.phase === 'obtaining';
    const elapsed = PICKUP_DURATION-game.pickupTime;
    root.current.position.set(game.x,game.y+3.5+Math.sin(elapsed*3)*.06,game.z);
    root.current.rotation.y = game.yaw + .3;
    root.current.scale.setScalar(Math.max(.001,pickupEnvelope(game.pickupTime)));
    models.forEach((model,index)=>{model.visible=['sword','shield','bow','wood-sword','wood-shield'][index]===game.pickupItem;});
    if (root.current.children[models.length]) root.current.children[models.length].visible=game.pickupItem==='treasure';
  });
  return <group ref={root} name="pickup-presentation" visible={false}>
    {models.map((model,index)=><primitive key={index} object={model}/>)}
    <mesh><octahedronGeometry args={[.42]}/><meshStandardMaterial color="#9bef78" emissive="#527f19" emissiveIntensity={.5}/></mesh>
    <mesh rotation={[Math.PI/2,0,0]} position={[0,-.63,0]}>
      <torusGeometry args={[.63,.016,5,40]}/><meshBasicMaterial color="#ffdc81"/>
    </mesh>
  </group>;
}
