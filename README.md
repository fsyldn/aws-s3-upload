# aws-s3-upload
亚马逊--分段上传封装
<br>
初始化aws对象 -- 可以全局<br />
   let s3 = new s3Upload({<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;apiVersion: '2006-03-01',<br />
        &nbsp;&nbsp;&nbsp;&nbsp;params: {<br />
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Bucket: Bucket<br />
        &nbsp;&nbsp;&nbsp;&nbsp;},<br />
        &nbsp;&nbsp;&nbsp;&nbsp;accessKeyId: accessKeyId,<br />
        &nbsp;&nbsp;&nbsp;&nbsp;secretAccessKey: secretAccessKey,<br />
        &nbsp;&nbsp;&nbsp;&nbsp;endpoint: 'http://10.0.7.231',<br />
    })
    // 上传<br />
    let upload1 // 上传对象<br />
    let idss = '' // 断点续传所用Id<br />
    function filechange(e) {<br />
        &nbsp;&nbsp;let file = e.files[0]<br />
        // 分文件上传<br />
       &nbsp;&nbsp;upload1 = new s3MultiUpload({<br />
         &nbsp;&nbsp;&nbsp;&nbsp;   s3: s3,<br />
        &nbsp;&nbsp;    /* required */<br />
        &nbsp;&nbsp;&nbsp;&nbsp;    file: file,<br />
        &nbsp;&nbsp;    /* required */<br />
         &nbsp;&nbsp;&nbsp;&nbsp;   restart: false, // 默认为true，可以阻止初始化，调用可用方法 init -- 重传用<br />
         &nbsp;&nbsp;&nbsp;&nbsp;   uploadNum: 5, // 每次上传的块并发数 默认5<br />
         &nbsp;&nbsp;&nbsp;&nbsp;   key: file.name,<br />
            //    成功回调<br />
          &nbsp;&nbsp;&nbsp;&nbsp;  onsuccess: function (res) {<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;      console.log(res)<br />
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;     document.getElementById('url').innerHTML = res.Location<br />
         &nbsp;&nbsp;&nbsp;&nbsp;   },<br />
            //    错误回调<br />
           &nbsp;&nbsp;&nbsp;&nbsp; onerror: function (err, item) {<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    console.log(err, item)<br />
          &nbsp;&nbsp;&nbsp;&nbsp;  },<br />
            //    进度<br />
           &nbsp;&nbsp;&nbsp;&nbsp; onprogress:function(percent) {<br />
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;     document.getElementById('progress').innerHTML = percent + '%'<br />
           &nbsp;&nbsp;&nbsp;&nbsp; },<br />
           &nbsp;&nbsp;&nbsp;&nbsp; onuploadId:function(id) { // 非必选<br />
                //  断点续传用id，<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    console.log(id)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    idss = id<br />
          &nbsp;&nbsp;&nbsp;&nbsp;  }<br />
        &nbsp;&nbsp;})<br />
        // 提供的方法<br />
        //upload1.abort() -- 终止上传<br />
        //upload1.cotinueUpload(uploadId) -- 续传<br />
    }<br />
    function stops() {<br />
      &nbsp;&nbsp;&nbsp;&nbsp;  upload1.abort()<br />
    }<br />
    function start() {<br />
      &nbsp;&nbsp;&nbsp;&nbsp;  upload1.cotinueUpload(idss)<br />
    }<br />
