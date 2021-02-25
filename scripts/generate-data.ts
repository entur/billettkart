import fs from 'fs'
import util from 'util'
import { Feature, FeatureCollection, Polygon } from 'geojson'

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const PERIOD_TICKETS_CONFIG = {
    counties: [],
    tariffZones: [
        'SKY:TariffZone:A',
        'SKY:TariffZone:E',
        'SKY:TariffZone:F',
        /RUT:/, // Alle Ruter-sonene
        'KOL:TariffZone:450', // Dalane
        'KOL:TariffZone:151', // Jæren
        'KOL:TariffZone:150', // Nord-Jæren
        'KOL:TariffZone:452', // Egersund
    ],
}

const SINGLE_TICKETS_CONFIG = {
    counties: ['Viken', 'Innlandet'],
    tariffZones: [
        /BRA:/, // Alle Brakar-sonene
        /OST:/, // Alle Østfold-sonene
        /RUT:/, // Alle Ruter-sonene
        'SKY:TariffZone:A', // Skyss sone A
        'TEL:TariffZone:860', // Siljan
        'TEL:TariffZone:861', // Skien
        'TEL:TariffZone:862', // Porsgrunn
        'TEL:TariffZone:863', // Bamble
        'VKT:TariffZone:701', // Vestfold Nord
        'VKT:TariffZone:702', // Tønsberg
        'VKT:TariffZone:704', // Larvik
        'VKT:TariffZone:601', // Drammen
        'VKT:TariffZone:703', // Sandefjord
    ],
}

type TariffZoneProps = {
    id: string
    name: string
    fill: string
    keyValues: Array<{
        key: string
        values: string[]
    }>
}

type TariffZone = Feature<Polygon, TariffZoneProps>

type CountyProps = {
    name: string
}

type County = Feature<Polygon, CountyProps>

async function main() {
    try {
        const tariffZones: FeatureCollection<
            Polygon,
            TariffZoneProps
        > = JSON.parse(
            await readFile('data/tariffZones.json', {
                encoding: 'utf-8',
            }),
        )
        const counties: FeatureCollection<Polygon, CountyProps> = JSON.parse(
            await readFile('data/counties.json', {
                encoding: 'utf-8',
            }),
        )

        const singleAreas: Array<County | TariffZone> = [
            ...counties.features.filter((county) =>
                SINGLE_TICKETS_CONFIG.counties.some(
                    (name) => county.properties.name === name,
                ),
            ),
            ...tariffZones.features.filter((zone) =>
                SINGLE_TICKETS_CONFIG.tariffZones.some((str) =>
                    zone.properties.id.match(str),
                ),
            ),
        ]

        const periodAreas: Array<County | TariffZone> = [
            ...counties.features.filter((county) =>
                PERIOD_TICKETS_CONFIG.counties.some(
                    (name) => county.properties.name === name,
                ),
            ),
            ...tariffZones.features.filter((zone) =>
                PERIOD_TICKETS_CONFIG.tariffZones.some((str) =>
                    zone.properties.id.match(str),
                ),
            ),
        ]

        await Promise.all([
            writeFile(
                'public/singleTickets.json',
                JSON.stringify({
                    type: 'FeatureCollection',
                    features: singleAreas,
                }),
                {
                    encoding: 'utf-8',
                },
            ),
            writeFile(
                'public/periodTickets.json',
                JSON.stringify({
                    type: 'FeatureCollection',
                    features: periodAreas,
                }),
                {
                    encoding: 'utf-8',
                },
            ),
        ])
    } catch (error) {
        console.error(error)
    }
}

void main()
