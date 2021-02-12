import React, { useState, useRef } from 'react'
import ReactMapGL, { MapRef } from 'react-map-gl'
import { Layer } from 'mapbox-gl'

import { Checkbox, Fieldset } from '@entur/form'
import { Contrast } from '@entur/layout'
import { Heading1 } from '@entur/typography'

import './styles.css'

const Home: React.FC = () => {
    const mapRef = useRef<MapRef>()

    const [viewport, setViewport] = useState<any>({
        width: window.innerWidth,
        height: window.innerHeight,
        latitude: 64,
        longitude: 16,
        zoom: 4,
    })

    const [layers, setLayers] = useState<Layer[]>([])
    const [activeLayers, setActiveLayers] = useState<string[]>([])

    const onLoad = () => {
        const map = mapRef.current?.getMap()
        if (!map) return
        const style = map.getStyle()
        const allLayers = (style.layers as Layer[]).filter(
            (layer) => layer.id !== 'background',
        )
        setLayers(allLayers)
        setActiveLayers(allLayers.map(({ id }) => id))
    }

    const setLayerVisibility = (layer: Layer, visible: boolean): void => {
        const map = mapRef.current?.getMap()
        if (!map) return
        if (visible) {
            setActiveLayers((prev) => [...prev, layer.id])
            map.addLayer(layer)
        } else {
            map.removeLayer(layer.id)
            setActiveLayers((prev) => prev.filter((id) => id !== layer.id))
        }
    }

    return (
        <>
            <ReactMapGL
                ref={mapRef}
                onLoad={onLoad}
                {...viewport}
                mapboxApiAccessToken="pk.eyJ1IjoiZW50dXIiLCJhIjoiY2tsMTI0eWF2MTVzZjJxcDB4Mjg1OWhueSJ9.-UbvDTcEvuMSRl5qbxpqBg"
                mapStyle="mapbox://styles/entur/ck71tudd803k01ipem9pw1qsw"
                onViewportChange={(nextViewport: any) =>
                    setViewport(nextViewport)
                }
            />
            <Contrast className="control-panel">
                <Heading1>Tilbudskart</Heading1>
                <Fieldset label="Hva vil du se?">
                    {layers.map((layer) => (
                        <Checkbox
                            checked={activeLayers.includes(layer.id)}
                            onChange={(e) =>
                                setLayerVisibility(layer, e.target.checked)
                            }
                            key={layer.id}
                        >
                            {layer.id}
                        </Checkbox>
                    ))}
                </Fieldset>
            </Contrast>
        </>
    )
}

export default Home
