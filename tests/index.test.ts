import "reflect-metadata";
import { DataSource, Entity, PrimaryColumn, Column } from "typeorm";
import streamEntities from "../src/index";

@Entity()
class TestEntity {
    @PrimaryColumn() id!: number;
    @Column() name!: string;

    constructor() {}

    static build(id: number, name: string): TestEntity {
        const entity = new TestEntity();
        entity.id = id;
        entity.name = name;
        return entity;
    }
}

const dataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    database: "test",
    username: "test",
    password: "test",
    synchronize: true,
    logging: false,
    entities: [TestEntity]
});

beforeAll(() => dataSource.initialize());
afterAll(() => dataSource.destroy());
beforeEach(() => dataSource.getRepository(TestEntity).clear());

test('streams a single entity', async () => {
    await dataSource.manager.save(TestEntity.build(1, "John"));

    const stream = (
        await streamEntities(dataSource, TestEntity)
    )[Symbol.asyncIterator]();
    
    const john = await stream.next();
    expect(john.done).toBe(false);
    expect(john.value.id).toBe(1);
    expect(john.value.name).toBe("John");

    const end = await stream.next();
    expect(end.done).toBe(true);
    expect(end.value).toBeUndefined();
});

test('streams multiple entities', async () => {
    await dataSource.manager.save(TestEntity.build(1, "John"));
    await dataSource.manager.save(TestEntity.build(2, "Jane"));
    
    const stream = (
        await streamEntities(dataSource, TestEntity, query => query.orderBy("id"))
    )[Symbol.asyncIterator]();
    
    const john = await stream.next();
    expect(john.done).toBe(false);
    expect(john.value.id).toBe(1);
    expect(john.value.name).toBe("John");

    const jane = await stream.next();
    expect(jane.done).toBe(false);
    expect(jane.value.id).toBe(2);
    expect(jane.value.name).toBe("Jane");

    const end = await stream.next();
    expect(end.done).toBe(true);
    expect(end.value).toBeUndefined();
});

test('streams multiple entities in async for...of loop', async () => {
    await dataSource.manager.save(TestEntity.build(1, "John"));
    await dataSource.manager.save(TestEntity.build(2, "Jane"));

    const entities = await streamEntities(dataSource, TestEntity, query => query.orderBy("id"));

    let expectedId = 1;
    for await (const entity of entities) {
        if (expectedId > 2) fail("unexpected number of entities in stream");

        expect(entity.id).toBe(expectedId);
        expect(entity.name).toBe(["John", "Jane"][expectedId - 1]);

        expectedId++;
    }
});

test('streams filtered entities', async () => {
    await dataSource.manager.save(TestEntity.build(1, "John"));
    await dataSource.manager.save(TestEntity.build(2, "Jane"));
    
    const stream = (
        await streamEntities(dataSource, TestEntity, query => query.where({name: "John"}))
    )[Symbol.asyncIterator]();
    
    const john = await stream.next();
    expect(john.done).toBe(false);
    expect(john.value.id).toBe(1);
    expect(john.value.name).toBe("John");

    const end = await stream.next();
    expect(end.done).toBe(true);
    expect(end.value).toBeUndefined();
});

