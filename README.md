<!-- make header for the listing of commands (HTTP) possible -->
# Reil[ins]eta

Reileta is a system for the management for AtelierVR.

## Table of Contents

- [Reil\[ins\]eta](#reilinseta)
  - [Table of Contents](#table-of-contents)
  - [Eta (Registry Server)](#eta-registry-server)
  - [Reil (Security Server)](#reil-security-server)
  - [Ins (Instance Servers)](#ins-instance-servers)
  - [HTTP Requests](#http-requests)
    - [Server](#server)
    - [Authentication](#authentication)
    - [User](#user)
    - [Services](#services)
    - [Worlds](#worlds)
    - [Integrity](#integrity)
    - [Challenges](#challenges)
    - [Instances](#instances)
  - [WebSocket Connection](#websocket-connection)
    - [Requests](#requests)
      - [General](#general)
      - [Event Subscriptions](#event-subscriptions)
      - [Instances](#instances-1)
    - [Events](#events)
  - [Objects](#objects)
    - [Server](#server-1)
    - [User](#user-1)
    - [World](#world)

## How to install

1) Clone the repository
```sh
git clone https://github.com/hactazoff/AVR-Reileta.git
cd AVR-Reileta/
```

2) Install the dependencies
```sh
npm install
```

3) Create a .env file and fill it with the .env.example file
```sh
cp .env.example .env
```

4) Start the server
```sh
npm run dev
```

## Environment Parameters

- `DATABASE_URL=string path` - The database url
- `REILETA_ID=string` - The id of the server
- `REILETA_ENABLE=boolean` - If the server is enabled
- `REILETA_PORT=number` - The port of the server
- `REILETA_PREFERED_ADDRESS=string` - The prefered address of the server
- `REILETA_SECURE=boolean` - If the server is secure
- `REILETA_AUTH_CAN_LOGIN=boolean` - If you can login
- `REILETA_AUTH_CAN_REGISTER=boolean` - If you can register
- `REILETA_AUTH_CAN_DELETE=boolean` - If you can delete your account
- `REILETA_INTEGRITY_CAN_CREATE=boolean` - If you can create integrity
- `REILETA_INTEGRITY_CAN_CHECK=boolean` - If you can check integrity
- `REILETA_SOFT_HIDE_WORLDS=boolean` - If you can view all worlds
- `REILETA_WORLD_CAN_MODIFY=boolean` - If you can modify worlds
- `REILETA_WORLD_FALLBACK=string` - The fallback world id
- `REILETA_TMP_FILE_EXPIRATION=number` - The expiration of the temporary files
- `REILETA_DEFAULT_USER_TAGS=string` - The default user tags (comma separated)
- `REILETA_CAN_EDIT_WORLD=boolean` - If you can edit worlds
- `REILETA_SUPPORTED_WORLD_ASSET_ENGINE=string` - The supported world asset engines (comma separated)
- `REILETA_SUPPORTED_WORLD_ASSET_PLATFORMS=string` - The supported world asset platforms (comma separated)
- `REILETA_INTEGRITY_EXPIRATION=number` - The expiration of the integrity
- `HIDE_IP=boolean` - If you can hide the ip
' `REILETA_CAN_UPLOAD_FILE=boolean` - If you can upload files
- `REILETA_FILE_PATH=string` - The file origin path





## Eta (Registry Server)

>The Eta is the main server of the system.
It is the registry server for the users, services and worlds.

## Reil (Security Server)

>The Reil is the security server of the system.
It is the security server for authentication, challenges and proxy.
It can moderate the authorized servers and clients.
On Request HTTP, it can add `AVR-Gateway: {secure bool} {address string}` header with the gateway address of the server.

## Ins (Instance Servers)

>The Ins are the instance servers of the system.
They can be created by the users, services or decicated servers.
They communicate with socket connections to the Reil and Eta servers.
The others clients can connect to the Ins servers with the Reil server.

## HTTP Requests

>The system of Reileta is based on HTTP requests.
The secure connection is mostly impotant and trustingly.
The following table shows the available requests.
All requests if you get a external server, you have to use the `?server` query parameter.

A sample response looks like this:

```ts
{
    "request": REQUEST_URL,
    "data": DATA_OBJECT | undefined,
    "time": TIMESTAMP_IN_MILLISECONDS,
    "error": {
        "code": ERROR_CODE,
        "message": ERROR_MESSAGE
    } | undefined,
    "redirect": {
        "secure": REDIRECT_SECURE,
        "address": REDIRECT_ADDRESS
    } | undefined
}
```

- `REQUEST_URL` is the url of the request.
- `DATA_OBJECT` is the real response data of the request.
- `TIMESTAMP_IN_MILLISECONDS` is the timestamp of the request.
- `ERROR_CODE` is the error code of the request.
- `ERROR_MESSAGE` is the error message of the request.
- `REDIRECT_SECURE` is the secure of the redirect for the next request.
- `REDIRECT_ADDRESS` is the address of the redirect for the next request.

### Server

- [GET /api/server](#get-api-server) - Get the server information
- [POST /api/server](#post-api-server) - Update the server information
- [GET /api/time](#get-api-time) - Get the server time

### Authentication

> The authentication is based on a token. You can Authenticate yourself with the following requests with the `Authorization` and `User-Agent: AVR(User)` headers, or with the `?authuser` (deprecated) query parameter.

- [POST /api/auth/login](#post-apiauthlogin) - Login with a user
- [POST /api/auth/register](#post-apiauthregister) - Register a new user
- [GET /api/auth/logout](#post-apiauthlogout) - Logout the current session
- [DELETE /api/auth/logout](#delete-apiauthlogout) - Delete the current session

### User

>Tips: If you use `@me` as user `:id`, you can get the information about the current user.
You can find a user by its ID or its name.
The `:server` parameter is optional and only needed if you want to get the information of a user on a specific server. You can't not use ids with starting with `@`, because they are reserved for the system. For example `@me` is the current user, `@server` is the server, and `@admin` is the main admin of the server.

- [GET /api/users](#get-apiusers) - Get all users
- [GET /api/users/:id](#get-apiusersid) - Get a user information
- [POST /api/users/:id](#post-apiusersid) - Update a user information
- [DELETE /api/users/:id](#delete-apiusersid) - Delete a user

#### Home

- [GET /api/users/:id/home](#get-apiusersidhome) - Get the user home
- [POST /api/users/:id/home](#post-apiusersidhome) - Update the user home
- [DELETE /api/users/:id/home](#delete-apiusersidhome) - Delete the user home

#### Thumbnail

- [GET /api/users/:id/thumbnail](#get-apiusersidthumbnail) - Get the user thumbnail png
- [POST /api/users/:id/thumbnail](#post-apiusersidthumbnail) - Upload a new user thumbnail png
- [DELETE /api/users/:id/thumbnail](#delete-apiusersidthumbnail) - Delete the user thumbnail png

#### Banner

- [GET /api/users/:id/banner](#get-apiusersidbanner) - Get the user banner png
- [POST /api/users/:id/banner](#post-apiusersidbanner) - Upload a new user banner png
- [DELETE /api/users/:id/banner](#delete-apiusersidbanner) - Delete the user banner png

### Services

> The services are addons the the mods client ans other services server.
Is must be a unique id for alls services of the global system.

- [GET /api/services](#get-apiplugins) - Get all services
- [PUT /api/services](#put-apiplugins) - Create a new service
- [GET /api/services/:id](#get-apipluginsid) - Get a service information
- [POST /api/services/:id](#post-apipluginsid) - Update a service information
- [DELETE /api/services/:id](#delete-apipluginsid) - Delete a service

### Worlds

- [GET /api/worlds](#get-apiworlds) - Get all worlds
- [PUT /api/worlds](#put-apiworlds) - Create a new world
- [GET /api/worlds/:id](#get-apiworldsid) - Get a world information
- [POST /api/worlds/:id](#post-apiworldsid) - Update a world information
- [DELETE /api/worlds/:id](#delete-apiworldsid) - Delete a world

#### Thumbnail

- [GET /api/worlds/:id/thumbnail](#get-apiworldsidthumbnail) - Get the world thumbnail png
- [POST /api/worlds/:id/thumbnail](#post-apiworldsidthumbnail) - Upload a new world thumbnail png
- [DELETE /api/worlds/:id/thumbnail](#delete-apiworldsidthumbnail) - Delete the world thumbnail png

#### Assets

- [GET /api/worlds/:id/assets](#get-apiworldsidassets) - Get all assets
- [PUT /api/worlds/:id/assets](#put-apiworldsidassets) - Create a new asset
- [GET /api/worlds/:id/assets/:asset](#get-apiworldsidassetsasset) - Get a asset information
- [POST /api/worlds/:id/assets/:asset](#post-apiworldsidassetsasset) - Update a asset information
- [DELETE /api/worlds/:id/assets/:asset](#delete-apiworldsidassetsasset) - Delete a asset

#### Asset File

- [GET /api/worlds/:id/assets/:asset/file](#get-apiworldsidassetsassetfile) - Get the asset file
- [POST /api/worlds/:id/assets/:asset/file](#post-apiworldsidassetsassetfile) - Upload a new asset file

### Challenges

> The server challenges are a way to get a token for a server.
The token is used to authenticate the server to a other server.
It can Authenticate itself with the following requests with the `Authorization` and `User-Agent: AVR(Server)` headers, or with the `?authserver` query parameter.

- [GET /api/challenges](#get-apiserver-challenges) - Get all server challenges
- [PUT /api/challenges](#put-apiserver-challenges) - Create a new server challenge
- [GET /api/chalnges/:id](#get-apiserver-challengesid) - Get a server challenge information
- [DELETE /api/challenges/:id](#delete-apiserver-challengesid) - Delete a server challenge

### Integrity

> The integrity is a way to check the identity of a user on a other server, to access private data or access to a instance.
It can Authenticate itself with the following requests with the `Authorization` and `User-Agent: AVR(User)` headers, or with the `?integrityuser` query parameter.

- [GET /api/integrity](#get-apiintegrity) - Get all integrity
- [PUT /api/integrity](#put-apiintegrity) - Fetch a new integrity token by a sever for a own user (server only)
- [POST /api/integrity](#post-apiintegrity) - Fetch a create integrity token by a user for a server (user only, on host server)

### Instances

> The instances are the servers of the system.

- [GET /api/instances](#get-apiinstances) - Get all instances
- [PUT /api/instances](#put-apiinstances) - Create a new instance
- [GET /api/instances/:id](#get-apiinstancesid) - Get a instance information
- [POST /api/instances/:id](#post-apiinstancesid) - Update a instance information
- [DELETE /api/instances/:id](#delete-apiinstancesid) - Delete a instance
- [GET /api/instances/:id/candidate](#get-apiinstancesidcandidate) - Get the candidate of the instance
- [POST /api/instances/:id/candidate](#post-apiinstancesidcandidate) - Add a candidate to join the instance
- [DELETE /api/instances/:id/candidate](#delete-apiinstancesidcandidate) - Remove a candidate to join the instance

## WebSocket Connection

> The utility of the WebSocket is to the communication with the proxy and the instance servers.
The WebSocket is used to send and receive data from your server.

- [GET /api/ws](#get-apiws) - Get the WebSocket connection

### Requests

Sample request:

```ts
{
    "state"?: REQUEST_STATE,
    "command": REQUEST_EVENT,
    "data": DATA_OBJECT | undefined,
}
```

- `REQUEST_STATE` is the state custom state of the request.
- `REQUEST_EVENT` is the event of the request. Is represented by a path, for example `avr/instance:join`.
- `DATA_OBJECT` is the data of the request.

Sample response:

```ts
{
    "state"?: RESPONSE_STATE,
    "command": RESPONSE_EVENT,
    "data": DATA_OBJECT | undefined,
    "error": {
        "code": ERROR_CODE,
        "message": ERROR_MESSAGE
    } | undefined
}
```

- `RESPONSE_STATE` is the state custom state of the response.
- `RESPONSE_EVENT` is the event of the response.
- `DATA_OBJECT` is the data of the response.
- `ERROR_CODE` is the error code of the response.
- `ERROR_MESSAGE` is the error message of the response.

#### General

- [ping](#ws-ping) - Get the pong of the server
- [authenticate](#ws-authenticate) - Authenticate to the server

#### Event Subscriptions

- [subscribe](#ws-subscribe) - Subscribe to a event
- [unsubscribe](#ws-unsubscribe) - Unsubscribe to a event

#### Instances

- [instance-enter](#ws-join) - Join a instance
- [instance-quit](#ws-leave) - Leave a instance

### Events

- [avr/ping](#ws-ping) - Pong of the server
    > The event is't send in logs.
    ```ts
    {
        "i": number, // Initial timestamp by the client
        "o": number // Timestamp by the server
    }
    ```
- [avr/authenticate](#ws-authentication) - All authentication events
    ```ts
    {
        "internal": boolean, // If use token or not
        "user": {
            "id": string,
            "username": string,
            "display": string,
            "server": string
        }
    }
    ```
- [update-user](#ws-update-user-me) - The users is updated
- [update](#ws-update) - All update events
- [update-server](#ws-update-server) - The server is updated
- [update-world](#ws-update-world) - The world is updated
- [update-service](#ws-update-service) - The service is updated
- [update-instance](#ws-update-instance) - The instances is updated
- [avr/instance:join](#ws-instance-join) - A user joined a instance
    ```ts
    {
        "socket": string, // The socket id of the user
        "user": string // The user id@server
    }
    ```
- [avr/instance:left](#ws-instance-left) - A user left a instance
    ```ts
    {
        "socket": string, // The socket id of the user
        "code": number // The code of the leave
    }
    ```
- [avr/instance:enter](#ws-instance-enter) - The current user entered a instance
    ```ts
    {
        "socket": string, // The socket id of the user
        "user": string, // The user id@server
    }
    ```
- [avr/instance:quit](#ws-instance-leave) - The current user left a instance
    ```ts
    {
        "socket": string, // The socket id of the user
        "code": Instance.QuitType // The code of the leave
        "message": string // The message of the leave
    }
    ```
- [avr/instance:data](#ws-instance-data) - A user send data in the instance
    > The event is't send in logs.
    ```ts
    {
        "socket": string, // The socket id of the user
        "data": any // The data of the user
    }
    ```
- [avr/instance:transform](#ws-instance-transform) - A user transform in the instance
    > The event is't send in logs.
    ```ts
    {
        "socket": string, // The socket id of the user
        "path": string, // The path of the transform
        "position": Transform.Position,
        "rotation": Transform.Rotation,
        "scale": Transform.Scale
    }
    ```
- [instance-candidate](#ws-instance-candidate) - A user is a candidate to join or cancel the instance
- [instance-queue](#ws-instance-queue) - The queue of the instance is updated
