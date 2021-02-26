import React, { useState, useRef } from 'react'
import ReactMapGL, { MapRef } from 'react-map-gl'
import { Layer } from 'mapbox-gl'
import { Feature, FeatureCollection, LineString } from 'geojson'

import bezierSpline from '@turf/bezier-spline'
import simplify from '@turf/simplify'

import { Checkbox, Fieldset } from '@entur/form'
import { Contrast } from '@entur/layout'
import { Heading1, Paragraph } from '@entur/typography'

import Logo from './Logo.svg'

import trafikkpakkeneGeojson from './trafikkpakkene.json'

import LAYERS from './layers.json'

import './styles.css'

const trafikkpakkene = trafikkpakkeneGeojson as FeatureCollection

type SmoothOptions = {
    tolerance?: number
    sharpness?: number
}

function smoothenGeojson(
    geojsonData: FeatureCollection,
    options?: SmoothOptions,
): FeatureCollection {
    const { tolerance = 0.1, sharpness = 1 } = options || {}
    return {
        ...geojsonData,
        features: geojsonData.features.map((feature) => {
            const simpler = simplify(feature as Feature<LineString>, {
                tolerance,
            })

            if (feature.geometry.type !== 'LineString') {
                return simpler
            }

            const smoothy = bezierSpline(simpler, {
                properties: feature.properties,
                sharpness,
                resolution: 10000,
            })
            return smoothy
        }),
    }
}

function getTrafikkpakkeData() {
    return smoothenGeojson({
        type: 'FeatureCollection',
        features: trafikkpakkene.features.filter(
            (f) =>
                f.geometry.type === 'Point' || f.geometry.type === 'LineString',
        ),
    })
}

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

        map.removeLayer('_stedsnavn')
        map.removeLayer('_stedsprikker')

        map.addSource('counties', {
            type: 'geojson',
            data: 'counties.json',
        })

        map.addSource('periodTickets', {
            type: 'geojson',
            data: 'periodTickets.json',
        })

        map.addSource('singleTickets', {
            type: 'geojson',
            data: 'singleTickets.json',
        })

        map.addSource('trafikkpakkene', {
            type: 'geojson',
            data: getTrafikkpakkeData(),
        })

        map.addSource('steder', {
            type: 'geojson',
            data: 'steder.json',
        })

        LAYERS.forEach((layer) => map.addLayer(layer))

        const allLayers = (map.getStyle().layers as Layer[]).filter(
            (layer) => !layer.id.startsWith('_'),
        )
        setLayers(allLayers)
        setActiveLayers(allLayers.map(({ id }) => id))
    }

    const setLayerVisibility = (layer: Layer, visible: boolean): void => {
        const map = mapRef.current?.getMap()
        if (!map) return

        if (visible) {
            map.setLayoutProperty(layer.id, 'visibility', 'visible')
            setActiveLayers((prev) => [...prev, layer.id])
        } else {
            map.setLayoutProperty(layer.id, 'visibility', 'none')
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
                mapStyle="mapbox://styles/entur/ckl2e5p2o0pin17mp7v8ijtu4"
                onViewportChange={(nextViewport: any) =>
                    setViewport(nextViewport)
                }
            />
            <Contrast className="control-panel">
                <header
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Heading1 margin="none">
                        <img
                            src={Logo}
                            style={{
                                marginRight: 10,
                                marginBottom: 8,
                                maxHeight: 40,
                                maxWidth: '40vw',
                            }}
                            alt="Entur billettkart"
                        />
                    </Heading1>
                </header>
                <Paragraph>
                    Her kan du se hva du kan kjøpe i Entur-appen.
                </Paragraph>
                <Fieldset label="Hva vil du se?" style={{ marginTop: '2rem' }}>
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
