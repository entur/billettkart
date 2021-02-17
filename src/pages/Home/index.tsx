import React, { useState, useRef } from 'react'
import ReactMapGL, { MapRef } from 'react-map-gl'
import { Layer } from 'mapbox-gl'
import { Feature, FeatureCollection, LineString, Polygon } from 'geojson'

import bezierSpline from '@turf/bezier-spline'
import simplify from '@turf/simplify'

import { Checkbox, Fieldset } from '@entur/form'
import { Contrast } from '@entur/layout'
import { Heading1 } from '@entur/typography'

import sellableGeojson from './sellable.json'
import trafikkpakkeneGeojson from './trafikkpakkene.json'

import './styles.css'

type ZoneProps = { id: string; singleTickets: boolean; periodTickets: boolean }

const sellable = sellableGeojson as FeatureCollection<Polygon, ZoneProps>
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

function getZonesData() {
    return sellable
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

        map.removeLayer('_stedsprikker')
        map.removeLayer('_jernbanelinjer')
        map.removeLayer('Trafikkpakke 1')
        map.removeLayer('Trafikkpakke 2')
        map.removeLayer('Trafikkpakke 3')
        map.removeLayer('Trafikkpakke 4')

        map.addSource('zones', {
            type: 'geojson',
            data: getZonesData(),
        })

        map.addSource('trafikkpakkene', {
            type: 'geojson',
            data: getTrafikkpakkeData(),
        })

        map.addLayer({
            id: 'Trafikkpakkene',
            type: 'line',
            source: 'trafikkpakkene',
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-width': [
                    'case',
                    ['==', ['get', 'trafikkpakke'], false],
                    1,
                    4,
                ],
                'line-color': [
                    'case',
                    ['has', 'trafikkpakke1'],
                    '#ff9494',
                    [
                        'case',
                        ['has', 'trafikkpakke2'],
                        '#64b3e7',
                        [
                            'case',
                            ['has', 'trafikkpakke3'],
                            '#5ac39a',
                            [
                                'case',
                                ['has', 'trafikkpakke4'],
                                '#efd358',
                                '#adb5e1',
                            ],
                        ],
                    ],
                ],
            },
        })

        map.addLayer({
            id: '_prikker',
            type: 'circle',
            source: 'trafikkpakkene',
            filter: ['match', ['get', 'place'], ['city'], true, false],
            paint: {
                'circle-color': '#393d79',
                'circle-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    4,
                    0,
                    5,
                    1,
                ],
                'circle-radius': 4,
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 1.5,
                'circle-stroke-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    4,
                    0,
                    5,
                    1,
                ],
            },
        })

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
