import fs from 'fs'
import util from 'util'
import polyline from '@mapbox/polyline'
import createEnturService from '@entur/sdk'
import { Feature, MultiLineString } from 'geojson'

const writeFile = util.promisify(fs.writeFile)

const sdk = createEnturService({
    clientName: 'entur-billettkart',
})

type LineId = {
    id: string
    publicCode: string
}

type Line = {
    id: string
    publicCode: string
    journeyPatterns: Array<{
        id: string
        pointsOnLink: {
            length: number
            points: string
        }
    }>
}

type LineProps = {
    id: string
    publicCode: string
}

type LineFeature = Feature<MultiLineString, LineProps>

async function getLineWithPattern(id: string): Promise<LineFeature | null> {
    const { line } = await sdk.queryJourneyPlanner<{
        line: Line
    }>(
        `{line(id:"${id}"){id publicCode journeyPatterns{id pointsOnLink{length points}}}}`,
        {},
    )

    if (!line) {
        return null
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'MultiLineString',
            coordinates: line.journeyPatterns.map((journeyPattern) => {
                const coords = polyline
                    .decode(journeyPattern.pointsOnLink.points)
                    .map(([lat, lon]) => [lon, lat])
                return coords
            }),
        },
        properties: {
            id: line.id,
            publicCode: line.publicCode,
        },
    }
}

async function downloadTariffZones() {
    try {
        const { lines } = await sdk.queryJourneyPlanner<{
            lines: LineId[]
        }>('{lines(transportModes:[rail]){id publicCode}}', {})

        const ids = lines.map((line) => line.id)

        const features = []

        for (const id of ids) {
            const line = await getLineWithPattern(id)
            features.push(line)
        }

        const featureCollection = {
            type: 'FeatureCollection',
            features,
        }

        await writeFile('data/lines.json', JSON.stringify(featureCollection), {
            encoding: 'utf-8',
        })
    } catch (error) {
        console.error(error)
    }
}

void downloadTariffZones()
