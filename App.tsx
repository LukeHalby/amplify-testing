import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform, TextInput, StyleSheet } from 'react-native';
import { Observable } from 'zen-observable-ts';
import { sortBy, uniq, uniqBy } from 'lodash';
import * as Queries from './src/graphql/queries'
import * as Mutations from './src/graphql/mutations'
import * as Subscriptions from './src/graphql/subscriptions'
import {
  ListMessagesQuery,
  OnMutateMessageSubscription,
  CreateMessageInput
} from './src/API'
import { Amplify, Analytics, API } from 'aws-amplify';
import { graphqlOperation, GraphQLResult } from '@aws-amplify/api'
import awsconfig from './aws-exports';
import { Message } from './src/API';
Amplify.configure(awsconfig);

const Strong = (props: any) => <Text style={{fontWeight: 'bold'}}>{props.children}</Text>

interface SubscriptionValue<T> {
  value: { data: T }
}
type Msg = Message

/* 
This is the code responsible for showing notifications
while app is in the foreground 
*/
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'id',
      body: 'test body',
      from: 'someone',
      updatedAt: 'idk',
      _version: 1,
      __typename: "Message",
      _lastChangedAt: 1
    }
  ]);
  const [messageInput, setMessageInput] = React.useState<string>('')
  const [notification, setNotification] = useState<any>(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  //Push notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token)
    });

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  React.useEffect(() => {
    if (!!expoPushToken) {
      Analytics.updateEndpoint({ 
        Address: expoPushToken,
        ChannelType: 'CUSTOM',
        OptOut: 'NONE'
      });
      Analytics.record({ name: 'homepageVisit' });
    }
  }, [expoPushToken])

  function RenderMessages() {
    return messages.map((msg: Message, index: number) => 
      <Text key={index}><Strong>{`${msg.from}: `}</Strong>{msg.body}</Text>
    )
  }


  // Chat
  React.useEffect(() => {
    const query = API.graphql({
      query: Queries.listMessages
    }) as Promise<GraphQLResult<ListMessagesQuery>>

    query
      .then((result) => {
        setMessages(uniqBy(sortBy(result.data?.listMessages?.items as Message[], 'createdAt'), 'id'))
    })
      .catch((error) => {
        console.error(error)
      })

    
    /*const sub = API.graphql(
      graphqlOperation(Subscriptions.onMutateMessage)
      // @ts-ignore
    ).subscribe({
      next: ({ provider, value }: { provider: any, value: any }) => console.log({ provider, value }),
      error: (error: any) => console.warn(error)
    })*/
    
    const sub = (API.graphql({
      query: Subscriptions.onMutateMessage,
      variables: { roomId: "1" }
    }) as unknown as Observable<SubscriptionValue<OnMutateMessageSubscription>>
    ).subscribe({
      next: (resp: SubscriptionValue<OnMutateMessageSubscription>) => {
        const msg: Msg = resp.value.data.onMutateMessage!
        setMessages((msgs) => uniqBy(sortBy([...msgs, msg], 'createdAt'), 'id'))
      },
      error: (error: any) => console.warn(error)
    })

    return () => sub.unsubscribe()
  }, [])

  async function handleSubmit() {
    if (!!messageInput && !!expoPushToken) {
      try {
        await API.graphql({
          query: Mutations.createMessage,
          variables: {
            input: {
              body: messageInput,
              from: expoPushToken,
              roomId: "1"
            }
          }
        })
      } catch(e) {
        console.error(e)
      }
    }
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
      }}>
      <Text>Your expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {RenderMessages()}
      </View>
      <TextInput
        style={styles.input}
        onChangeText={setMessageInput}
        value={messageInput}
        onSubmitEditing={() => {handleSubmit}}
      />
      {/*<Button
        title="Press to Send Notification"
        onPress={async () => {
          //await sendPushNotification(expoPushToken);
          Analytics.record({ name: 'buttonClick' });
        }}
      />*/}
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

const styles = StyleSheet.create({
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
