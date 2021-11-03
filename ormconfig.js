module.exports = [
    {
        type: 'sqlite',
        database: 'db/honeybees-club.sqlite',
        synchronize: true,
        logging: false,
        entities: ['./entities/honeybees-club/'],
    },
    {
        name: 'survey',
        type: 'sqlite',
        database: 'db/survey.sqlite',
        synchronize: true,
        logging: false,
        entities: ['./entities/survey/'],
    },
]
