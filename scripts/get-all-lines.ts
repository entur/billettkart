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

function samePoint(a: number[], b: number[]): boolean {
    return a[0] === b[0] && a[1] === b[1]
}

function linesOverlapping(line1: number[][], line2: number[][]): boolean {
    const longestLine = line1.length > line2.length ? line1 : line2
    const shortestLine = line1.length > line2.length ? line2 : line1

    const startIndex = longestLine.findIndex((point) =>
        samePoint(point, shortestLine[0]),
    )

    if (startIndex < 0) return false

    for (
        let shortestIndex = 0;
        shortestIndex < shortestLine.length;
        shortestIndex++
    ) {
        const longestIndex = startIndex + shortestIndex
        const pointA = longestLine[longestIndex]
        const pointB = shortestLine[shortestIndex]

        if (!pointA || !samePoint(pointA, pointB)) {
            return false
        }
    }

    return true
}

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
            coordinates: line.journeyPatterns
                // Remove duplicate pointsOnLink before decoding
                .filter(
                    (jp, i, array) =>
                        i ===
                        array.findIndex(
                            ({ pointsOnLink }) =>
                                pointsOnLink.points === jp.pointsOnLink.points,
                        ),
                )
                // Decode pointsOnLink to coordinate arrays
                .map((journeyPattern) =>
                    polyline
                        .decode(journeyPattern.pointsOnLink.points)
                        .map(([lat, lon]) => [lon, lat]),
                )
                // Remove all lines contained by another line
                .filter((line, i, lines) => {
                    const otherLineStrings = lines.filter((l) => l !== line)
                    return !otherLineStrings.some((l) =>
                        linesOverlapping(l, line),
                    )
                }),
        },
        properties: {
            id: line.id,
            publicCode: line.publicCode,
        },
    }
}

async function downloadLines() {
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

void downloadLines()
