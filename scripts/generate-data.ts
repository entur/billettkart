import fs from 'fs'
import util from 'util'
import {
    Feature,
    FeatureCollection,
    MultiLineString,
    MultiPolygon,
    Polygon,
} from 'geojson'

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

const readJson = async <T>(path: string): Promise<T> => {
    const contents = await readFile(path, { encoding: 'utf-8' })
    return JSON.parse(contents)
}

const writeJson = async <T>(path: string, data: T): Promise<void> => {
    await writeFile(path, JSON.stringify(data), {
        encoding: 'utf-8',
    })
}

function featureCollection(features: Feature[]): FeatureCollection {
    return { type: 'FeatureCollection', features }
}

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
    counties: ['Viken', 'Oslo', 'Innlandet'],
    tariffZones: [
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

const TRAFIKKPAKKE_1 = [
    'GOA:Line:50', // Sørtoget Region
    'GOA:Line:53', // Sørtoget Lokal
    'GOA:Line:59', // Jærbanen
]

const TRAFIKKPAKKE_2 = [
    'SJN:Line:79',
    'SJN:Line:71',
    'SJN:Line:72',
    'SJN:Line:22',
    'SJN:Line:21',
    'SJN:Line:26',
    'SJN:Line:25',
]

const TRAFIKKPAKKE_3 = [
    'VYG:Line:43', // Arnalokalen
    'VYG:Line:41', // Bergensbanen
    'VYG:Line:45', // Vossebanen
]

const TRAFIKKPAKKE_4 = [
    'L1', // Asker/Spikkestad - Lillestrøm
    'L2', // Skøyen/Stabekk - Ski
    'L21', // Stabekk - Moss
    'L22', // Skøyen - Mysen/Rakkestad
    'R20', // Oslo S - Halden
    'L3', // Oslo S - Jaren
    'R30', // Oslo S - Gjøvik
]

const TRAFIKKPAKKE_5 = [
    'L12', // Kongsberg - Eidsvoll
    'L13', // Drammen - Dal
    'L14', // Asker - Kongsvinger
    'R10', // Drammen - Lillehammer
    'R11', // Skien - Eidsvoll
    'L52', // Notodden - Porsgrunn
]

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

type County = Feature<MultiPolygon, CountyProps>

type LineProps = {
    id: string
    publicCode: string
}

async function main() {
    try {
        const tariffZones = await readJson<
            FeatureCollection<Polygon, TariffZoneProps>
        >('data/tariffZones.json')

        const counties = await readJson<
            FeatureCollection<MultiPolygon, CountyProps>
        >('data/counties.json')

        const lines = await readJson<
            FeatureCollection<MultiLineString, LineProps>
        >('data/lines.json')

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

        const trafikkpakke1 = lines.features.filter((line) =>
            TRAFIKKPAKKE_1.some((id) => id === line.properties.id),
        )

        const trafikkpakke2 = lines.features.filter((line) =>
            TRAFIKKPAKKE_2.some((id) => id === line.properties.id),
        )

        const trafikkpakke3 = lines.features.filter((line) =>
            TRAFIKKPAKKE_3.some((id) => id === line.properties.id),
        )

        const trafikkpakke4 = lines.features.filter((line) =>
            TRAFIKKPAKKE_4.some((code) => code === line.properties.publicCode),
        )

        const trafikkpakke5 = lines.features.filter((line) =>
            TRAFIKKPAKKE_5.some((code) => code === line.properties.publicCode),
        )

        await Promise.all([
            writeJson(
                'public/singleTickets.json',
                featureCollection(singleAreas),
            ),
            writeJson(
                'public/periodTickets.json',
                featureCollection(periodAreas),
            ),
            writeJson(
                'data/trafikkpakke1.json',
                featureCollection(trafikkpakke1),
            ),
            writeJson(
                'data/trafikkpakke2.json',
                featureCollection(trafikkpakke2),
            ),
            writeJson(
                'data/trafikkpakke3.json',
                featureCollection(trafikkpakke3),
            ),
            writeJson(
                'data/trafikkpakke4.json',
                featureCollection(trafikkpakke4),
            ),
            writeJson(
                'data/trafikkpakke5.json',
                featureCollection(trafikkpakke5),
            ),
        ])
    } catch (error) {
        console.error(error)
    }
}

void main()
