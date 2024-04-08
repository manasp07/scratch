import React, { useState, useRef } from 'react';
import playIcon from './icon--play.svg';
import stopIcon from './icon--stop.svg';
import microphoneIcon from './icon--microphone.svg';


const RecordingButtonLite = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const [streamstatus,setstreamstatus]=useState(false)
  const [stream,setstream]=useState(null)
 


   const createstream = async ()=>{

    console.log("in recording lite")
    let stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: 'tab' },
      audio: true,
      preferCurrentTab:true
    });
    console.log("stream in create",stream)
    setstream(stream);
    setstreamstatus(true);
    
    //  stream.getVideoTracks()[0].onended tells if permission is stopped
    stream.getVideoTracks()[0].onended=()=>{
      setstreamstatus(false)
      setstream(null);
      stopRecording();
    }
   }

  //  // work with this this tells when user stops permission
  //  stream.getVideoTracks()[0].onended


    const startRecording = async () => {
    try {
      

      console.log("starting recording and newstream",stream)
      // console.log("stream status=",streamstatus,"stream",stream)
      
      if (streamstatus===false || stream===null){

        console.log("creating stream")
        createstream()
        console.log("created done stream")

        
       
      }
        
      
    
        // work with this this tells when user stops permission
       stream.getVideoTracks()[0].onended=()=>{
        setstreamstatus(false)
        setstream(null);
        stopRecording();
      }

      console.log("making recorder")

      const chunks = [];
      const mediaRecorder =  new MediaRecorder(stream);
      console.log(mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
        console.log("in recording");
      };
      

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'screen_record.webm';
        a.click();
        window.URL.revokeObjectURL(url);
        setIsRecording(false);
        clearInterval(timerRef.current);
        setTimer(0);
        
        
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing display media:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setTimer(0);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  



  return (
    <div>
      <div style={{ position: "absolute", left: "1000px" ,top:"5px"}} onClick={isRecording ? stopRecording : startRecording}>
        <img src={isRecording ? stopIcon : playIcon}  width="30px" />
        <span  />
        <img src={microphoneIcon} width="25px" />
      </div>
      {isRecording && <span style={{ background: '#800080',
       // Oval background color
          padding: '5px 10px', // Adjust padding as needed
          borderRadius: '20px', // Adjust border radius to create an oval shape
          position: 'absolute',
          top: '20px',
          left: '1140px',
          transform: 'translate(-50%, -50%)',
          color:'white' }} >{formatTime(timer)}</span>}
    </div>
  );
};

export default RecordingButtonLite



// import React, { useState, useRef } from 'react';
// import playIcon from './icon--play.svg';
// import stopIcon from './icon--stop.svg';
// import microphoneIcon from './icon--microphone.svg';


// const RecordingButtonLite = () => {
//   const [isRecording, setIsRecording] = useState(false);
//   const [timer, setTimer] = useState(0);
//   const [permissionGranted, setPermissionGranted] = useState(false);
//   const mediaRecorderRef = useRef(null);
//   const timerRef = useRef(null);
//   const [streamstatus,setstreamstatus]=useState(false)
//   const [stream,setstream]=useState(null)
 


//    const createstream = async ()=>{

//     console.log("in recording lite")
//     let stream = await navigator.mediaDevices.getDisplayMedia({
//       video: { mediaSource: 'tab' },
//       audio: true,
//       preferCurrentTab:true
//     });
//     console.log("stream in create",stream)
//     setstream(stream);
//     setstreamstatus(true);
    
//     //  stream.getVideoTracks()[0].onended tells if permission is stopped
//     stream.getVideoTracks()[0].onended=()=>{
//       setstreamstatus(false)
//       setstream(null);
//       stopRecording();
//     }
//    }

//   //  // work with this this tells when user stops permission
//   //  stream.getVideoTracks()[0].onended


//     const startRecording = async () => {
//     try {
      

//       console.log("starting recording and newstream",stream)
//       // console.log("stream status=",streamstatus,"stream",stream)
      
//       if (streamstatus===false || stream===null){

//         console.log("creating stream")
//         createstream()
//         console.log("created done stream")

        
       
//       }
        
      
    
//         // work with this this tells when user stops permission
//        stream.getVideoTracks()[0].onended=()=>{
//         setstreamstatus(false)
//         setstream(null);
//         stopRecording();
//       }

//       console.log("making recorder")

//       const chunks = [];
//       const mediaRecorder =  new MediaRecorder(stream);
//       console.log(mediaRecorder);

//       mediaRecorder.ondataavailable = (event) => {
//         chunks.push(event.data);
//         console.log("in recording");
//       };
      

//       mediaRecorder.onstop = () => {
//         const blob = new Blob(chunks, { type: 'video/webm' });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         document.body.appendChild(a);
//         a.style = 'display: none';
//         a.href = url;
//         a.download = 'screen_record.webm';
//         a.click();
//         window.URL.revokeObjectURL(url);
//         setIsRecording(false);
//         clearInterval(timerRef.current);
//         setTimer(0);
        
        
//       };

//       mediaRecorderRef.current = mediaRecorder;
//       mediaRecorder.start();
//       setIsRecording(true);

//       timerRef.current = setInterval(() => {
//         setTimer((prev) => prev + 1);
//       }, 1000);
//     } catch (error) {
//       console.error('Error accessing display media:', error);
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current) {
//       mediaRecorderRef.current.stop();
//     }
//     setTimer(0);
//   };

//   const formatTime = (seconds) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
//   };

  



//   return (
//     <div>
//       <div style={{ position: "relative", left: "300px" }} onClick={isRecording ? stopRecording : startRecording}>
//         <img src={isRecording ? stopIcon : playIcon}  width="30px" />
//         <span  />
//         <img src={microphoneIcon} width="25px" />
//       </div>
//       {isRecording && <span style={{ background: '#800080',
//        // Oval background color
//           padding: '5px 10px', // Adjust padding as needed
//           borderRadius: '20px', // Adjust border radius to create an oval shape
//           position: 'absolute',
//           top: '20px',
//           left: '1140px',
//           transform: 'translate(-50%, -50%)',
//           color:'white' }} >{formatTime(timer)}</span>}
//     </div>
//   );
// };