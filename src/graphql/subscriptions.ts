/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onMutateMessage = /* GraphQL */ `
  subscription OnMutateMessage($roomId: ID) {
    onMutateMessage(roomId: $roomId) {
      id
      body
      from
      roomId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const onCreateMessage = /* GraphQL */ `
  subscription OnCreateMessage {
    onCreateMessage {
      id
      body
      from
      roomId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const onUpdateMessage = /* GraphQL */ `
  subscription OnUpdateMessage {
    onUpdateMessage {
      id
      body
      from
      roomId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
export const onDeleteMessage = /* GraphQL */ `
  subscription OnDeleteMessage {
    onDeleteMessage {
      id
      body
      from
      roomId
      createdAt
      updatedAt
      _version
      _deleted
      _lastChangedAt
    }
  }
`;
