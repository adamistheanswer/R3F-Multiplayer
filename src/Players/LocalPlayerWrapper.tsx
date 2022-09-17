import React, { useRef, useCallback, useEffect, useMemo } from 'react'
import {
   OrbitControls,
   PerspectiveCamera,
   Text,
   useFBX,
   useTexture,
} from '@react-three/drei'
import { useFrame, extend } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Mesh, Vector3, Euler, Raycaster, Group, TextureLoader } from 'three'
import { useMediaQuery } from 'react-responsive'
import nipplejs from 'nipplejs'
import { BoxGeometry, MeshNormalMaterial } from 'three'
import Player from './Player'

extend({
   BoxGeometry,
   MeshNormalMaterial,
})

let fwdValue = 0
let bkdValue = 0
let rgtValue = 0
let lftValue = 0

type useJoystickProps = {
   isTabletOrMobile: boolean
}

function useJoystick({ isTabletOrMobile }: useJoystickProps) {
   const handleEnd = () => {
      bkdValue = 0
      fwdValue = 0
      lftValue = 0
      rgtValue = 0
   }

   let joyManager: any

   useEffect(() => {
      if (!joyManager && isTabletOrMobile) {
         joyManager = nipplejs.create({
            zone: document.getElementById('joystickWrapper1')!,
            size: 120,
            maxNumberOfNipples: 1,
            mode: 'static',
            restJoystick: true,
            shape: 'circle',
            position: { bottom: '80px', right: '80px' },
            dynamicPage: true,
         })
         joyManager['0'].on('move', handleMove)
         joyManager['0'].on('end', handleEnd)
      }

      return () => {
         if (joyManager) {
            joyManager['0'].off('move', handleMove)
            joyManager['0'].off('end', handleEnd)
         }
      }
   }, [isTabletOrMobile])
}

const handleMove = (_: {}, data: any) => {
   const forward = data.vector.y
   const turn = data.vector.x

   if (forward > 0) {
      fwdValue = Math.abs(forward)
      bkdValue = 0
   } else if (forward < 0) {
      fwdValue = 0
      bkdValue = Math.abs(forward)
   }

   if (turn > 0) {
      lftValue = 0
      rgtValue = Math.abs(turn)
   } else if (turn < 0) {
      lftValue = Math.abs(turn)
      rgtValue = 0
   }
}

const LocalPlayerWrapper = ({ clientSocket, remoteColliders }) => {
   const orbitRef = useRef<OrbitControlsImpl>(null)
   const camRef = useRef<any>()
   const meshRef = useRef<Mesh | Group>(null)
   const velocity = 1

   const lastHeading = useRef(0)
   const lastPosition = useRef([0, 0, 0])

   const tempVector = useMemo(() => new Vector3(), [])
   const upVector = useMemo(() => new Vector3(0, 1, 0), [])
   // const boxGemo = useMemo(() => new BoxGeometry(10, 10, 10), [])
   // const boxMat = useMemo(() => new MeshNormalMaterial(), [])

   // console.log('hit')

   const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1224px)' })

   useJoystick({ isTabletOrMobile })

   const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
         case 'ArrowUp':
         case 'KeyW':
            handleMove({}, { vector: { y: 1 } })
            break

         case 'ArrowLeft':
         case 'KeyA':
            handleMove({}, { vector: { x: -1 } })
            break

         case 'ArrowDown':
         case 'KeyS':
            handleMove({}, { vector: { y: -1 } })
            break

         case 'ArrowRight':
         case 'KeyD':
            handleMove({}, { vector: { x: 1 } })
            break
         default:
            break
      }
   }

   const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
         case 'ArrowUp':
         case 'KeyW':
            fwdValue = 0
            break

         case 'ArrowLeft':
         case 'KeyA':
            lftValue = 0
            break

         case 'ArrowDown':
         case 'KeyS':
            bkdValue = 0
            break

         case 'ArrowRight':
         case 'KeyD':
            rgtValue = 0
            break
         default:
            break
      }
   }

   useEffect(() => {
      document.addEventListener('keydown', onKeyDown)
      document.addEventListener('keyup', onKeyUp)

      return () => {
         document.removeEventListener('keydown', onKeyDown)
         document.removeEventListener('keyup', onKeyUp)
      }
   }, [])

   const updatePlayer = useCallback(() => {
      const mesh = meshRef.current
      const controls = orbitRef.current
      const camera = camRef.current

      function arrIdentical(a1, a2) {
         let i = a1.length
         if (i != a2.length) return false
         while (i--) {
            if (a1[i] !== a2[i]) return false
         }
         return true
      }

      function checkPlayerBlocked(tempVector) {
         let blocked = false

         const intersects = new Raycaster(
            mesh?.position.clone(),
            tempVector
         ).intersectObjects(remoteColliders.current)

         let distances = intersects.map((player) => player.distance)

         distances.forEach((distance) => {
            if (distance < 1) {
               blocked = true
            }
         })

         if (blocked) {
            return true
         }
      }

      if (mesh && controls && camera) {
         const heading = Number(controls.getAzimuthalAngle().toFixed(2))

         if (fwdValue > 0) {
            tempVector.set(0, 0, -fwdValue).applyAxisAngle(upVector, heading)

            if (checkPlayerBlocked(tempVector)) {
               return
            }

            mesh.position.addScaledVector(tempVector, velocity)
         }

         if (bkdValue > 0) {
            tempVector.set(0, 0, bkdValue).applyAxisAngle(upVector, heading)

            if (checkPlayerBlocked(tempVector)) {
               return
            }

            mesh.position.addScaledVector(tempVector, velocity)
         }

         if (lftValue > 0) {
            tempVector.set(-lftValue, 0, 0).applyAxisAngle(upVector, heading)

            if (checkPlayerBlocked(tempVector)) {
               return
            }
            mesh.position.addScaledVector(tempVector, velocity)
         }

         if (rgtValue > 0) {
            tempVector.set(rgtValue, 0, 0).applyAxisAngle(upVector, heading)
            if (checkPlayerBlocked(tempVector)) {
               return
            }
            mesh.position.addScaledVector(tempVector, velocity)
         }

         camera.position.sub(controls.target)
         controls.target.copy(mesh.position)
         camera.position.add(mesh.position)
         mesh.setRotationFromEuler(new Euler(0, heading, 0, 'XYZ'))

         let meshPositionArr = mesh.position.toArray()
         meshPositionArr[0] = Number(meshPositionArr[0].toFixed(2))
         meshPositionArr[1] = 5
         meshPositionArr[2] = Number(meshPositionArr[2].toFixed(2))

         if (
            lastHeading.current === heading &&
            arrIdentical(lastPosition.current, meshPositionArr)
         ) {
            return
         }

         if (lastHeading.current !== heading) {
            lastHeading.current = heading
         }

         if (!arrIdentical(lastPosition.current, meshPositionArr)) {
            lastPosition.current = meshPositionArr
         }

         clientSocket.emit('move', {
            r: heading,
            p: meshPositionArr,
         })
      }
   }, [meshRef, orbitRef, camRef, velocity, clientSocket])

   useFrame(() => {
      updatePlayer()
   })

   let model = useFBX('../Models/Player/Mushy.fbx')
   model.scale.setScalar(0.015)
   model.traverse((child: any) => {
      if (child.isSkinnedMesh) {
         const texture = useTexture('../Models/Player/mushySkin.png')
         child.material[1].map = texture
         child.material.needsupdate = true
         child.castShadow = true
         child.receiveShadow = true
      }
   })

   return (
      <>
         <PerspectiveCamera
            position={[25, 10, 25]}
            fov={70}
            ref={camRef}
            makeDefault
         />
         <OrbitControls
            autoRotate={false}
            enableDamping={false}
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.4}
            target={[0, 0, 0]}
            // minPolarAngle={Math.PI / 2}
            maxPolarAngle={Math.PI / 2 - 0.1}
            ref={orbitRef}
         />
         <group ref={meshRef}>
            <Text
               rotation={[0, 0, 0]}
               position={[0, 13, 0]}
               fontSize={1}
               color="yellow"
               anchorX="center"
               anchorY="middle"
            >
               {clientSocket.id}
            </Text>
            <primitive position={[0, 1.2, 0]} object={model} ref={meshRef} />
         </group>
      </>
   )
}

export default LocalPlayerWrapper
