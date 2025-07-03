import {
  CognitoUserPool,
  CognitoUserAttribute,
  CognitoUser,
  AuthenticationDetails
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: 'us-east-1_vUo50ofKI',
  ClientId: '5qt5c09ke6ahumgppnn69h0vu4',
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
  let valid = false;
  user.getSession((err: any, session: any) => {
    if (err || !session || !session.isValid()) {
      valid = false;
    } else {
      valid = true;
    }
  });
  return valid;
} 