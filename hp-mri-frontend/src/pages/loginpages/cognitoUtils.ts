import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_vUo50ofKI',
  ClientId: '4nvgf7et9f4ui0glr4ddf152r8',
};

const userPool = new CognitoUserPool(poolData);

export function signUpCognito(name: string, email: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const attributeList = [
      new CognitoUserAttribute({ Name: 'name', Value: name }),
      new CognitoUserAttribute({ Name: 'email', Value: email }),
    ];
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// confirm user's signup code from email
export function confirmSignUpCognito(email: string, code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export function signInCognito(email: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const userData = {
      Username: email,
      Pool: userPool,
    };
    const cognitoUser = new CognitoUser(userData);
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        // Store user information in localStorage
        const idToken = result.getIdToken();
        const payload = idToken.payload;
        const name = payload.name || payload.email || email;
        const userEmail = payload.email || email;
        
        localStorage.setItem('cognito_user_name', name);
        localStorage.setItem('cognito_user_email', userEmail);
        
        resolve(result);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

export function isAuthenticated(): boolean {
  const user = userPool.getCurrentUser();
  if (!user) return false;
  
  // This is a synchronous check - for more accurate results, use getCurrentUserName()
  return user !== null;
}

export function getCurrentUserName(): string | null {
  const user = userPool.getCurrentUser();
  if (!user) return null;
  
  // Try to get the username from localStorage first (set during sign in)
  const storedName = localStorage.getItem('cognito_user_name');
  if (storedName) {
    return storedName;
  }
  
  // Fallback to email if no name is stored
  const storedEmail = localStorage.getItem('cognito_user_email');
  if (storedEmail) {
    return storedEmail;
  }
  
  return null;
}

export const getCurrentUserId = () => {
  const session = localStorage.getItem('amplify-authenticator-authState');
  if (session) {
    try {
      const parsedSession = JSON.parse(session);
      // Cognito stores the sub (subject) as the unique user ID
      return parsedSession.tokens?.idToken?.payload?.sub || null;
    } catch (err) {
      console.error('Error parsing auth session:', err);
      return null;
    }
  }
  return null;
};

export function signOutCognito() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
  
  // Clear stored user information
  localStorage.removeItem('cognito_user_name');
  localStorage.removeItem('cognito_user_email');
} 