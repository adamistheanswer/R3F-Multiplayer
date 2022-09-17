/* This file was initially auto-generated by https://github.com/pmndrs/gltfjsx and then adapted manually */

import React from 'react'
import { useFBX, useTexture } from '@react-three/drei'

export default function Mushy({ color, ...props }) {
    let Model = useFBX('../Models/Player/Mushy.fbx'),
    Model.scale.setScalar(0.015)
    Model.traverse((child: any) => {
       if (child.isSkinnedMesh) {
          const texture = useTexture('../Models/Player/mushySkin.png')
          child.material[1].map = texture
          child.material.needsupdate = true
          child.castShadow = true
          child.receiveShadow = true
       }
    })
  return (
    <Model/>
  )
}


