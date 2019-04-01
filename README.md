# aws-s3-upload
亚马逊--分段上传封装

// 初始化aws对象 -- 可以全局
    let s3 = new s3Upload({
        apiVersion: '2006-03-01',
        params: {
            Bucket: Bucket
        },
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        endpoint: 'http://10.0.7.231',
    })
    // 上传
    let upload1 // 上传对象
    let idss = '' // 断点续传所用Id
    function filechange(e) {
        let file = e.files[0]
        // 分文件上传
        upload1 = new s3MultiUpload({
            s3: s3,
            /* required */
            file: file,
            /* required */
            restart: false, // 默认为true，可以阻止初始化，调用可用方法 init -- 重传用
            uploadNum: 5, // 每次上传的块并发数 默认5
            key: file.name,
            //    成功回调
            onsuccess: function (res) {
                console.log(res)
                document.getElementById('url').innerHTML = res.Location
            },
            //    错误回调
            onerror: function (err, item) {
                console.log(err, item)
            },
            //    进度
            onprogress:function(percent) {
                document.getElementById('progress').innerHTML = percent + '%'
            },
            onuploadId:function(id) { // 非必选
                //  断点续传用id，
                console.log(id)
                idss = id
            }
        })
        // 提供的方法
        //upload1.abort() -- 终止上传
        //upload1.cotinueUpload(uploadId) -- 续传
    }
    function stops() {
        upload1.abort()
    }
    function start() {
        upload1.cotinueUpload(idss)
    }
