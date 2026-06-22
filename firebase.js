/* ================================================================
   firebase.js
   LifeLink — Firebase FCM Push Notifications
================================================================ */

const FirebaseNotifications = (() => {

  let messaging = null;
  let fcmToken = null;


  /* INIT FIREBASE */
  async function init(){

    if(
      !CONFIG.FIREBASE.apiKey ||
      CONFIG.FIREBASE.apiKey === "YOUR_FIREBASE_API_KEY"
    ){

      console.warn(
        "Firebase not configured"
      );

      return;

    }


    try{


      await loadFirebaseSDK();


      if(!firebase.apps.length){

        firebase.initializeApp(
          CONFIG.FIREBASE
        );

      }


      messaging =
      firebase.messaging();



      await requestPermission();



      messaging.onMessage(
        payload=>{


          console.log(
            "FCM MESSAGE:",
            payload
          );


          handleIncomingMessage(
            payload
          );


        }
      );



      console.log(
        "LifeLink Firebase initialized"
      );


    }

    catch(err){

      console.error(
        "Firebase init error:",
        err
      );

    }


  }




  /* LOAD SDK */
  function loadFirebaseSDK(){


    return new Promise(
      (resolve,reject)=>{


        if(
          typeof firebase !== "undefined"
        ){

          resolve();
          return;

        }



        const files=[

"https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",

"https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js"

        ];



        let loaded=0;



        files.forEach(src=>{


          const s =
          document.createElement(
            "script"
          );


          s.src=src;


          s.onload=()=>{


            loaded++;


            if(
              loaded===files.length
            )

            resolve();


          };



          s.onerror=()=>reject();



          document.head
          .appendChild(s);



        });



      }

    );


  }





  /* REQUEST PERMISSION */
  async function requestPermission(){


    try{


      const permission =
      await Notification
      .requestPermission();




      if(
        permission !== "granted"
      ){


        console.warn(
          "Notifications blocked"
        );


        showToast(
          "warning",
          "Notifications Blocked",
          "Enable browser notifications"
        );


        return;


      }




      /*
        FIX:
        do not call getToken()
        with fake VAPID key
      */


      if(

        CONFIG.FIREBASE.vapidKey &&

        CONFIG.FIREBASE.vapidKey
        !== "YOUR_VAPID_KEY"

      ){



        fcmToken =
        await messaging.getToken({


          vapidKey:

          CONFIG.FIREBASE.vapidKey


        });




        console.log(

          "FCM TOKEN:",

          fcmToken

        );




        await registerTokenWithBackend(

          fcmToken

        );



      }


      else{


        console.warn(

        "Firebase VAPID missing - token skipped"

        );


      }




      showToast(

        "success",

        "🔔 Notifications Enabled",

        "Emergency alerts ready"

      );



    }


    catch(err){


      console.error(

        "Permission error:",

        err

      );


    }



  }





  /* SEND TOKEN BACKEND */
  async function registerTokenWithBackend(token){


    if(!token)
    return;



    try{


      await fetch(

        CONFIG.BACKEND_URL +
        "/register-token",

        {

        method:"POST",

        headers:{

          "Content-Type":
          "application/json"

        },

        body:
        JSON.stringify({

          token,

          city:"Guntur",

          timestamp:
          Date.now()

        })


        }


      );



    }


    catch(err){


      console.warn(

        "Token backend failed",

        err

      );


    }


  }





  /* FOREGROUND MESSAGE */
  function handleIncomingMessage(payload){


    const title =
    payload.notification?.title
    ||
    "LifeLink Alert";



    const body =
    payload.notification?.body
    ||
    "New blood request";




    showToast(

      "warning",

      title,

      body

    );



  }







  /* SEND EMERGENCY */
  async function sendEmergencyAlert(alertData){


    try{


      const res =
      await fetch(

      CONFIG.BACKEND_URL+
      "/send-emergency",

      {

      method:"POST",

      headers:{

      "Content-Type":
      "application/json"

      },


      body:
      JSON.stringify(alertData)


      }

      );



      return await res.json();



    }


    catch(err){


      console.error(

        "Emergency error",

        err

      );


      return {

        error:
        err.message

      };


    }


  }






  async function notifyPatient(
    patientToken,
    donorInfo
  ){



    await fetch(

      CONFIG.BACKEND_URL+
      "/notify-patient",

      {

      method:"POST",

      headers:{

      "Content-Type":
      "application/json"

      },


      body:
      JSON.stringify({

        patientToken,

        donorInfo

      })

      }


    );


  }




  return {

    init,

    sendEmergencyAlert,

    notifyPatient,

    getToken:
    ()=>fcmToken

  };



})();





/* SERVICE WORKER */
if(
  "serviceWorker"
  in navigator
){


navigator
.serviceWorker
.register(

"/firebase-messaging-sw.js"

)

.then(reg=>{


console.log(

"LifeLink SW registered:",

reg.scope

);


})


.catch(err=>{


console.warn(

"SW error",

err

);


});


}





/* START */
document
.addEventListener(

"DOMContentLoaded",

()=>{


FirebaseNotifications
.init();


}

);