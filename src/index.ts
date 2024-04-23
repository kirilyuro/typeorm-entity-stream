import { DataSource, ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { Mutex } from "async-mutex";

export default async function streamEntities<Entity extends ObjectLiteral>(
    source: DataSource,
    target: new () => Entity,
    buildQuery: (queryBuilder: SelectQueryBuilder<Entity>) => SelectQueryBuilder<Entity> = (builder) => builder
) {
    const mutex = new Mutex();
    const results: Entity[] = [];
    const resolvers: ((value: IteratorResult<Entity> | PromiseLike<IteratorResult<Entity>>) => void)[] = [];
    let isDone = false;

    const stream = await buildQuery(source.getRepository(target).createQueryBuilder()).stream();

    stream.on("data", (rawEntity: { [key: string]: any }) => {
        mutex.runExclusive(async () => {
            const entity = parseEntity(target)(rawEntity);
            if (resolvers.length > 0) {
                // @ts-ignore: resolvers contain at least one element
                resolvers.shift()({value: entity, done: false});
            } else {
                results.push(entity);
            }
        });
    });

    stream.on("end", () => {
        mutex.runExclusive(async () => {
            isDone = true;
            while (resolvers.length > 0) {
                // @ts-ignore: resolvers contain at least one element
                resolvers.shift()({value: undefined, done: true});
            }
        });
    });

    const next = async () => {
        return new Promise<IteratorResult<Entity>>(resolve => {
            mutex.runExclusive(async () => {
                if (results.length > 0) {
                    // @ts-ignore: results contain at least one element
                    resolve({value: results.shift(), done: false});
                } else if (isDone) {
                    resolve({value: undefined, done: true});
                } else {
                    resolvers.push(resolve);
                }
            });
        });
    };

    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    return await next();
                },
            };
        },
    };
}

export const parseEntity = <Entity extends ObjectLiteral>(target: new () => Entity) => (rawEntity: { [key: string]: any }): Entity => {
    const entity = new target();
    Object.entries(rawEntity).map(([key, value]) => {
        // @ts-ignore: set unmarshalled property (unsafe, ugly, but works)
        entity[key.replace(new RegExp(`^${target.name}_`), '')] = value;
    });
    return entity;
}
