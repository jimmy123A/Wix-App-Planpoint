import React, { useState, ChangeEvent, useEffect } from 'react';
import {
  Button,
  Page,
  WixDesignSystemProvider,
  Box,
  Loader,
  Input,
  Heading
} from '@wix/design-system';
import '@wix/design-system/styles.global.css';
import { useWixModules, WixProvider } from "@wix/sdk-react";
import { embeddedScripts } from "@wix/app-market";
import { dashboard, withDashboard } from '@wix/dashboard-react';
import styles from './custom.module.css';
import axios from 'axios';

interface Item {
  id: string;
  name: string;
  imageUrl: string;
  namespace: string;
  hostName: string;
}

const loginToPlanpoint = async (email: string, password: string): Promise<string> => {
  try {
    const response = await axios.post('https://us-central1-planpoint-proxy.cloudfunctions.net/login', {
      email,
      password
    });

    const data = response.data;
    return data._id;
  } catch (err: any) {
    if (err.response) {
      alert(err.response.data.message || 'Login failed');
    } else {
      alert('Something went wrong. Please try again later');
    }
    return '';
  }
};

const fetchItems = async (type: string, apiKey: string): Promise<Item[]> => {
  const urlMap = {
    projects: 'https://us-central1-planpoint-proxy.cloudfunctions.net/getProjects',
    groups: 'https://us-central1-planpoint-proxy.cloudfunctions.net/getGroups',
    enterprises: 'https://us-central1-planpoint-proxy.cloudfunctions.net/getEnterprises'
  };

  try {
    // @ts-ignore
    const response = await axios.get(urlMap[type], {
      params: { uid: apiKey }
    });

    const data = response.data;
  
    return data.map((item: any) => ({
      id: item._id,
      name: item.name,
      namespace: item.namespace,
      hostName: item.hostName,
      imageUrl: type === 'projects' ? item.projectImageUrl : type === 'groups' ? item.groupImageUrl : type === 'enterprises' ? item.enterpriseImageUrl : 'https://via.placeholder.com/50'
    }));
  } catch (error) {
    // @ts-ignore
    alert(`Failed to fetch items: ${error.message}`);
    return [];
  }
};

function Index() { 
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('projects');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const { embedScript } = useWixModules(embeddedScripts);

  const handleLogin = async () => {
    if (!email) {
      alert('Enter your email please');
      return;
    }

    if (!password) {
      alert('Enter your password please');
      return;
    }

    try {
      setLoading('login');
      const fetchedApiKey = await loginToPlanpoint(email, password);
      setLoading('');

      if (fetchedApiKey) {
        setApiKey(fetchedApiKey);
        setIsLoggedIn(true);
        setSelectedTab('projects');
        fetchItems('projects', fetchedApiKey);
      }
    } catch (err) {
      setLoading('');
    }
  };

  const handleTabChange = async (value: string) => {
    setSelectedTab(value);
    setItems([]);
    setSelectedItem(null);
    setLoading('items');
    const fetchedItems = await fetchItems(value, apiKey);
    setItems(fetchedItems);
    setLoading('');
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleEmbedScript = async (type: string, item: Item) => {
    try {
      // Update the parameters with the new project URL
      const embedUrl = type === 'projects' ? 
        `https://app.planpoint.io/${item.namespace}/${item.hostName}` : 
        type === 'groups' ? 
          `https://app.planpoint.io/g/${item.namespace}/${item.hostName}` : 
          `https://app.planpoint.io/enterprise/${item.namespace}/${item.hostName}`;

      await embedScript({
        parameters: {
          "projectUrl": embedUrl
        },
      });

      alert('Script embedded successfully!');
    } catch (error: any) {
      console.error('Failed to embed script:', error);
      alert('Failed to embed script.');
    }
  }; 

  useEffect(() => {
    if (isLoggedIn) {
      handleTabChange(selectedTab);
    }
  }, [isLoggedIn, selectedTab]);

  return (
    <WixProvider auth={dashboard.auth()} host={dashboard.host()}>
      <WixDesignSystemProvider>
        <Page>
          <Page.Header
            title="Embed your Planpoint"
            subtitle="Select & automatically embed your Planpoint project, group or enterprise."
          />
          <Page.Content>
          {!isLoggedIn ? (
              <div>
                <Heading appearance="H3">Login to your account</Heading>
                <div style={{ marginTop: '20px' }}>
                  <Input
                    placeholder="Enter your email"
                    value={email}
                    onChange={handleEmailChange}
                  />
                </div>
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <Input
                    placeholder="Enter your password"
                    value={password}
                    type="password"
                    onChange={handlePasswordChange}
                  />
                </div>
                <Button onClick={handleLogin} disabled={loading === 'login'}>
                  {loading === 'login' ? <Loader size="small" color="white" /> : 'Login'}
                </Button>
              </div>
            ) : (
              <>
                {selectedItem ? (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <Button onClick={() => {
                        setSelectedItem(null)
                        const embedContainer = document.getElementById('embedContainer');
                        // @ts-ignore
                        embedContainer.innerHTML = ""
                      }} style={{ marginRight: '10px' }}>Back</Button>
                    <Heading appearance="H4">{selectedItem.name}</Heading>
                  </div>
                ) : (
                  <div className={styles.tabs}>
                    <button className={selectedTab === 'projects' ? styles.active : ''} onClick={() => handleTabChange('projects')}>Projects</button>
                    <button className={selectedTab === 'groups' ? styles.active : ''} onClick={() => handleTabChange('groups')}>Groups</button>
                    <button className={selectedTab === 'enterprises' ? styles.active : ''} onClick={() => handleTabChange('enterprises')}>Enterprises</button>
                  </div>
                )}
                {!selectedItem && <Box className={styles.itemsContainer}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item)
                        handleEmbedScript(selectedTab, item)
                      }}
                      style={{
                        // @ts-ignore
                        border: item.id === selectedItem?.id ? '2px solid blue' : '1px solid gray',
                        padding: '10px',
                        margin: '10px',
                        display: 'flex',
                        flexDirection: 'row',
                        cursor: 'pointer',
                      }}
                    >
                      <img src={item.imageUrl} alt={item.name} style={{ width: '50px', marginRight: '10px', height: '50px' }} />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </Box>}
                <div id="embedContainer"></div>
              </>
            )}
          </Page.Content>
        </Page>
      </WixDesignSystemProvider>
    </WixProvider>
  );
}

export default withDashboard(Index);
