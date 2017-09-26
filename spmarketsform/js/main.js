/**
 * Set up UI event listeners and registering Firebase auth listeners.
 */
window.onload = function() {
	// Init loading indicator
	initLoadingIndicator();
	// Sign the current user out on load
	firebase.auth().signOut().then(function() {
		// Sign-out successful.
	}).catch(function(error) {
		// An error happened.
		console.error('Error during signOut', error);
	});
	// Listening for auth state changes.
	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			// User is signed in.
			var uid = user.uid;
			var email = user.email;
			var photoURL = user.photoURL;
			var phoneNumber = user.phoneNumber;
			var isAnonymous = user.isAnonymous;
			var displayName = user.displayName;
			var providerData = user.providerData;
			var emailVerified = user.emailVerified;
		}
		updateSignInButtonUI();
		updateSignInFormUI();
		updateSignOutButtonUI();
		updateVerificationCodeFormUI();
	});

	// Event bindings.
	document.getElementById('sign-in-form').addEventListener('submit', onSignInSubmit);
	document.getElementById('sign-out-button').addEventListener('click', onSignOutClick);
	document.getElementById('phone-number').addEventListener('keyup', updateSignInButtonUI);
	document.getElementById('phone-number').addEventListener('change', updateSignInButtonUI);
	document.getElementById('verification-code').addEventListener('keyup', updateVerifyCodeButtonUI);
	document.getElementById('verification-code').addEventListener('change', updateVerifyCodeButtonUI);
	document.getElementById('verification-code-form').addEventListener('submit', onVerifyCodeSubmit);
	document.getElementById('cancel-verify-code-button').addEventListener('click', cancelVerification);

	// [START appVerifier]
	window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
		'size': 'normal',
		'callback': function(response) {
			// reCAPTCHA solved, allow signInWithPhoneNumber.
			// [START_EXCLUDE]
			updateSignInButtonUI();
			// [END_EXCLUDE]
		},
		'expired-callback': function() {
			// Response expired. Ask user to solve reCAPTCHA again.
			// [START_EXCLUDE]
			updateSignInButtonUI();
			// [END_EXCLUDE]
		}
	});
	// [END appVerifier]

	// [START renderCaptcha]
	recaptchaVerifier.render().then(function(widgetId) {
		window.recaptchaWidgetId = widgetId;
	});
	// [END renderCaptcha]
};

/**
 * Function called when clicking the Login/Logout button.
 */
function onSignInSubmit(e) {
	e.preventDefault();
	if (isCaptchaOK() && isPhoneNumberValid()) {
		window.signingIn = true;
		updateSignInButtonUI();
		// [START signin]
		var phoneNumber = getFormattedPhoneNumber();
		var appVerifier = window.recaptchaVerifier;
		// Check if the mobile number is already used
		if (isUserAlreadyCompletedForm()) {
			return;
		}
		// Send verification code
		showLoadingIndicator(true);
		firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
		.then(function (confirmationResult) {
			// SMS sent. Prompt user to type the code from the message, then sign the
			// user in with confirmationResult.confirm(code).
			window.confirmationResult = confirmationResult;
			// [START_EXCLUDE silent]
			window.signingIn = false;
			updateSignInButtonUI();
			updateVerificationCodeFormUI();
			updateVerifyCodeButtonUI();
			updateSignInFormUI();
			// [END_EXCLUDE]
			showLoadingIndicator(false);
		}).catch(function (error) {
			// Error; SMS not sent
			// [START_EXCLUDE]
			console.error('Error during signInWithPhoneNumber', error);
			window.alert('Error during signInWithPhoneNumber:\n\n' + error.code + '\n\n' + error.message);
			window.signingIn = false;
			updateSignInFormUI();
			updateSignInButtonUI();
			// [END_EXCLUDE]
			showLoadingIndicator(false);
		});
		// [END signin]
	}
}

/**
 * Function called when clicking the "Verify Code" button.
 */
function onVerifyCodeSubmit(e) {
	e.preventDefault();
	if (!!getCodeFromUserInput()) {
		window.verifyingCode = true;
		updateVerifyCodeButtonUI();
		// [START verifyCode]
		var code = getCodeFromUserInput();
		// Verify code
		showLoadingIndicator(true);
		confirmationResult.confirm(code).then(function (result) {
			// User signed in successfully.
			var user = result.user;
			// [START_EXCLUDE]
			window.verifyingCode = false;
			window.confirmationResult = null;
			updateVerificationCodeFormUI();
			// [END_EXCLUDE]
			showLoadingIndicator(false);
			// Load the Typeform in current page
			loadFormInCurrentPage();
		}).catch(function (error) {
			// User couldn't sign in (bad verification code?)
			// [START_EXCLUDE]
			console.error('Error while checking the verification code', error);
			window.alert('Error while checking the verification code:\n\n' + error.code + '\n\n' + error.message);
			window.verifyingCode = false;
			updateSignInButtonUI();
			updateVerifyCodeButtonUI();
			// [END_EXCLUDE]
			showLoadingIndicator(false);
		});
		// [END verifyCode]
	}
}

/**
 * Cancels the verification code input.
 */
function cancelVerification(e) {
	e.preventDefault();
	window.confirmationResult = null;
	updateVerificationCodeFormUI();
	updateSignInFormUI();
}

/**
 * Signs out the user when the sign-out button is clicked.
 */
function onSignOutClick() {
	firebase.auth().signOut();
}

/**
 * Reads the verification code from the user input.
 */
function getCodeFromUserInput() {
	return document.getElementById('verification-code').value;
}

/**
 * Reads the phone number from the user input.
 */
function getPhoneNumberFromUserInput() {
	return document.getElementById('phone-number').value;
}

/**
 * Get formatted phone number by adding the international code
 */
function getFormattedPhoneNumber() {
	var phoneNumber = getPhoneNumberFromUserInput().replace(/^[0]+/g,"");
	return "+64" + phoneNumber;
}

/**
 * Returns true if the phone number is valid.
 */
function isPhoneNumberValid() {
	var pattern = /(^[0][2][0-9]{1})(\d{7,8}$)+$/;
	var phoneNumber = getPhoneNumberFromUserInput();
	return phoneNumber.search(pattern) !== -1;
}

/**
 * Returns true if the ReCaptcha is in an OK state.
 */
function isCaptchaOK() {
	if (typeof grecaptcha !== 'undefined' 
	&& typeof window.recaptchaWidgetId !== 'undefined') {
		// [START getRecaptchaResponse]
		var recaptchaResponse = grecaptcha.getResponse(window.recaptchaWidgetId);
		// [END getRecaptchaResponse]
		return recaptchaResponse !== '';
	}
	return false;
}

/**
 * Re-initializes the ReCaptacha widget.
 */
function resetReCaptcha() {
	if (typeof grecaptcha !== 'undefined' 
	&& typeof window.recaptchaWidgetId !== 'undefined') {
		grecaptcha.reset(window.recaptchaWidgetId);
	}
}

/**
 * Updates the Sign-in button state depending on ReCAptcha and form values state.
 */
function updateSignInButtonUI() {
	document.getElementById('sign-in-button').disabled =
	!isCaptchaOK()
	|| !isPhoneNumberValid()
	|| !!window.signingIn;
}

/**
 * Updates the Verify-code button state depending on form values state.
 */
function updateVerifyCodeButtonUI() {
	document.getElementById('verify-code-button').disabled =
	!!window.verifyingCode
	|| !getCodeFromUserInput();
}

/**
 * Updates the state of the Sign-in form.
 */
function updateSignInFormUI() {
	if (firebase.auth().currentUser || window.confirmationResult) {
		document.getElementById('sign-in-form').style.display = 'none';
	} else {
		resetReCaptcha();
		document.getElementById('sign-in-form').style.display = 'block';
	}
}

/**
 * Updates the state of the Verify code form.
 */
function updateVerificationCodeFormUI() {
	if (!firebase.auth().currentUser && window.confirmationResult) {
		document.getElementById('verification-code-form').style.display = 'block';
	} else {
		document.getElementById('verification-code-form').style.display = 'none';
	}
}

/**
 * Updates the state of the Sign out button.
 */
function updateSignOutButtonUI() {
	if (firebase.auth().currentUser) {
		document.getElementById('sign-out-button').style.display = 'block';
	} else {
		document.getElementById('sign-out-button').style.display = 'none';
	}
}

/**
 * Updates the Signed in user status panel.
 */
function loadFormInCurrentPage() {
	// Hide main div
	$('#main').hide();

	// Get and pass meta data as params
	var mobile = 'mobile=' + getPhoneNumberFromUserInput();
	var code = 'code=' + getCodeFromUserInput();
	var url = 'https://lemont.typeform.com/to/n0tcww?' + mobile + '&' + code;

	// Create iframe and add it to the body
	var iframe = document.createElement('iframe');
	iframe.style.position = 'absolute'
	iframe.style.left = 0;
	iframe.style.right = 0;
	iframe.style.bottom = 0;
	iframe.style.top = 0;
	iframe.style.border = 0;
	iframe.id = 'typeform-full';
	iframe.width = '100%';
	iframe.height = '100%';
	iframe.src = url;
	document.body.appendChild(iframe);
}

/**
 * Check if the mobile number from user input is already used
 */
function isUserAlreadyCompletedForm() {
	var mobile = getPhoneNumberFromUserInput()
	var ref = firebase.database().ref('/users');
	var query = ref.orderByChild('phone').equalTo(mobile)
	query.once('value')
	.then(function(snapshot) {
		// snapshot.forEach(function (childSnapshot) {
		// 	var childValue = childSnapshot.val();
		// 	if (mobile.equalTo(childValue['phone'])) {
		// 		return true;
		// 	}
		// });
		var numChildren = snapshot.numChildren();
		if (numChildren > 0) {
			return true;
		} else {
			return false;
		}
	})
	.catch(function(error) {
		console.log('error: ' + error);
	});
}

/**
 * Create a loading indicator in the center of page.
 */
function initLoadingIndicator() {
	// Create container for loading indicator
	var container = document.createElement('div');
	container.id = 'indicator';
	container.className = 'sk-circle';
	container.style.position = 'absolute'
	container.style.top = '50%';
	container.style.left = '50%';
	container.style.marginTop = '-30px';
	container.style.marginLeft = '-30px';
	container.style.zIndex = 99;
	
	// Add indicator states as child
	for (i = 1; i <= 12; i++) {
		var child = document.createElement('div');
		child.className = 'sk-circle' + i + ' sk-child';
		container.appendChild(child);
	}
	
	// Add indicator and hide it by default
	document.body.appendChild(container);
	showLoadingIndicator(false);
}

/**
 * Show loading indicator
 */
function showLoadingIndicator(show) {
	if (show) {
		document.getElementById('indicator').style.display = 'block';
	} else {
		document.getElementById('indicator').style.display = 'none';
	}
}
