import fs from 'fs'
import util from 'util'
import createEnturService from '@entur/sdk'

const writeFile = util.promisify(fs.writeFile)

const sdk = createEnturService({
    clientName: 'entur-billettkart',
})

type TariffZone = {
    id: string
    name: {
        value: string
    }
    geometry: {
        type: 'Polygon'
        coordinates: number[][]
    }
    keyValues: Array<{
        key: string
        values: string[]
    }>
}

function getFill(zone: TariffZone) {
    const codeSpace = zone.id.slice(0, 3)
    switch (codeSpace) {
        case 'BRA':
            return '#F3D03E'
        case 'RUT':
            return '#ff0000'
        case 'OST':
            return '#EC33ff'
        case 'TEL':
            return '#6ac4ae'
        case 'VKT':
            return '#31b754'
        case 'INN':
            return '#44f'
        case 'KOL':
            return '#3cb454'
        case 'SKY':
            return '#d2492a'
        default:
            return '#666'
    }
}

async function downloadTariffZones() {
    try {
        const { tariffZones } = await sdk.queryNsr<{
            tariffZones: TariffZone[]
        }>(
            '{tariffZones{id name{value}geometry{type coordinates}keyValues{key values}}}',
            {},
        )

        const features = tariffZones.map((zone) => ({
            type: 'Feature',
            geometry: {
                ...zone.geometry,
                coordinates: [zone.geometry.coordinates],
            },
            properties: {
                id: zone.id,
                name: zone.name.value,
                fill: getFill(zone),
            },
        }))

        const featureCollection = {
            type: 'FeatureCollection',
            features,
        }

        await writeFile(
            'data/tariffZones.json',
            JSON.stringify(featureCollection),
            {
                encoding: 'utf-8',
            },
        )
    } catch (error) {
        console.error(error)
    }
}

void downloadTariffZones()
