# typeorm-entity-stream
[![NPM Version](https://img.shields.io/npm/v/typeorm-entity-stream)](https://www.npmjs.com/package/typeorm-entity-stream)
[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/vknQo6eC53mwD54gA89Qd/9YavAuW9EYHYVmH5bSdupm/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/circleci/vknQo6eC53mwD54gA89Qd/9YavAuW9EYHYVmH5bSdupm/tree/main)

Simple entities streaming for [TypeORM](https://typeorm.io/).  
Provides a clean and simple streaming API by extending TypeORM's built-in raw streaming capabilities.

## Usage
Install the npm package:
```sh
npm install typeorm-entity-stream --save
```
  
Import the streaming function:  
```ts
import streamEntities from "typeorm-entity-stream";
```

The type signature of `streamEntities` is (roughly):
```ts
async function streamEntities<Entity>(
    dataSource: DataSource,
    entityConstructor: new () => Entity,
    query?: (queryBuilder: SelectQueryBuilder<Entity>) => SelectQueryBuilder<Entity>
): AsyncIterator
```
where `DataSource` and `Entity` are TypeORM [DataSource](https://typeorm.io/data-source) and [Entity type](https://typeorm.io/entities), respectively; and `query` is an optional parameter that allows providing a [custom query](https://typeorm.io/select-query-builder).  
The function returns an [AsyncIterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator) of `Entity` instances, i.e. an object which can be iterated over using an async `for...of` loop (see examples below).

## Examples
_Note:  the records are **streamed** from the database, rather than being fetched all at once._

Suppose we have a database with the following entity:
```ts
@Entity()
class User {
    @PrimaryColumn() id: number;
    @Column() email: string;
    @Column() role: string;
}
```

Print the emails of all existing users:
```ts
const users = await streamEntities(dataSource, User);

for await (const user of users) {
    console.log(user.email);
}
```

Print the emails of all **admin** users:
```ts
const users = await streamEntities(dataSource, User, 
  query => query.where({ role: "admin" })
);

for await (const user of users) {
    console.log(user.email);
}
```
