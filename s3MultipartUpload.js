/**
 * aws s3 multipart upload  -- 大文件分块上传
 * auth by CP
 * 2019 03 28
 */

/**
 *new aws s3
 *
 * @param {*} params
 * apiversion    -- 版本 2006-03-01
 * params:{Bucket:''}
 * accssKeyId
 * secretAccessKey
 * endpoint -- 服务器地址
 * s3ForcePathStyle -- s3 -true
 * 
 */
var s3Upload = function(params){
    this.Bucket = params.params.Bucket
    var param =params
    params.s3ForcePathStyle = true
    return new AWS.S3(param)
}
/**------------------------- 分文件上传 ------------------------------------ */
// 上传对象
var s3MultiUpload = function(obj){
    
    // methods
    this.init(obj)
}

s3MultiUpload.prototype.init = function(obj){
    // 参数
    this.s3 = obj.s3 //s3对象
    this.Bucket = this.s3.config.params.Bucket
    this.key = obj.key || this.encodeName(file.name)  //文件名
    this.file = obj.file    //文件
    this.size_limit = obj.sizeLimit || 5 //每个分页上传大小 mb
    this.onsuccess = obj.onsuccess //成功后回调
    this.onerror = obj.onerror || function(){}
    this.onprogress = obj.onprogress || function(e){console.log(e)}//进度回调
    this.onuploadId = obj.onuploadId || function(e){console.log(e)}//id回调
    
    //内部用参数
    // 控制每次上传的分块数
    this.uploadNum = parseInt(obj.uploadNum) || 5
    //上传文件的大小
    this.total_size = this.file.size 
    //文件分块数
    this.parts = Math.ceil(this.total_size/(this.size_limit*1024*1024)) 
    // 文件分块数组
    this.partFiles = this.fileSlice(this.file,this.parts,this.size_limit*1024*1024)
    // 初始化id
    this.uploadId = '' 
    // 完成上传的块
    this.complete_part = [];
    // 每个分块上传对象
    this.uploadArr = []
    // 每个分块进度大小
    this.progressArr =[]
    // 是否终止
    this.stopFlag = false
    // 上传文件

    // 阻止初始化
    if(obj.restart){
        return false
    }


    // 初始化 -- 创建uploadId
    this.create(this.Bucket,this.key)

}
/**
 *创建初始化 -- uploadId
 *
 * @param {*} Bucket 
 * @param {*} key filenam
 */
s3MultiUpload.prototype.create = function(Bucket,Key){
    var params = {
        Bucket:Bucket,
        Key:Key
    }
    var vm = this
    this.s3.createMultipartUpload(params,function(err,data){
        if(err){
            vm.onError(err,'初始化错误')
        }else{
            vm.uploadId = data.UploadId
            vm.onUploadId(vm.uploadId)
            vm.uploadController(vm.partFiles)
        }
    })
}
// 并发控制
s3MultiUpload.prototype.uploadControllerLimit = function(){
    if(this.stopFlag){
        return false
    } else if (this.upload_limit_list.length>=this.upload_index) {
        var itmg = this.upload_limit_list[this.upload_index-1]
        this.uploadParts(this.upload_index,itmg,this.uploadId)
    }
}
s3MultiUpload.prototype.uploadController = function(files){
    var vm = this
    // 大于限制，并发控制
    if(files.length>this.uploadNum){
        vm.upload_limit_list = files
        // vm.upload_uploadarr = []
        vm.upload_index = this.uploadNum
        files.forEach(function(item,index){
            if(index<vm.uploadNum){
                vm.uploadParts((parseInt(index)+1),item,vm.uploadId)
            }
        });

    }else{
        files.forEach(function(item,index){
            vm.uploadParts((parseInt(index)+1),item,vm.uploadId)
        });
    }
}
s3MultiUpload.prototype.uploadParts = function(partNumber,filePart,id){
    var vm = this
    if(!filePart || this.stopFlag){
        vm.upload_index++
        vm.uploadControllerLimit()
        return false
    }
    var partNum = parseInt(partNumber)
    var objs = this.s3.uploadPart({
        Bucket: vm.Bucket,
        Key:vm.key,
        PartNumber:partNum,
        UploadId:id,
        Body:filePart
    },function(err,data){
        vm.upload_index++
        vm.uploadControllerLimit()
        if(err){
            vm.onError(err,'分块上传错误')
        }else{
 
        }
        var obj = {
            PartNumbeer:partNum
        }
        vm.complete_part.push(obj)
        // 如果获取的上传数组相等
        if(vm.complete_part.length == vm.parts){
            vm.listParts(id)
        }
    }).on('httpUploadProgress',function(evt){
        // console.log(evt)
        vm.progressArr[partNum-1] = evt.loaded
        if(evt.loaded == evt.total){
            vm.uploadArr[partNum-1] = null
        }else{
            vm.uploadArr[partNum-1] = objs
        }
        if(vm.stopFlag){
            vm.abort()
        }
        vm.onProgress()

    })
    vm.uploadArr[partNum-1] = objs
}
// list
s3MultiUpload.prototype.listParts = function(ids){
    var vm = this
    this.s3.listParts({
        Bucket: vm.Bucket,
        Key:vm.key,
        UploadId: ids
    },function(err,data){
        if(err){
            vm.onError(err,'获取已上传列表错误')
        }else{
            var live = data.Parts
            var partss = vm.getPartss(live)
            vm.complete_part = partss;
            console.log(live,data,partss)
            // 如果上传完了组合生成url
            if(live.length == vm.parts){
                vm.completeUpload(ids,partss)
            }else{
                vm.leavePartsload(partss)
            }
        }
    })
}
s3MultiUpload.prototype.leavePartsload = function(arr){
    var indss = [];//已经上传的part
    arr.forEach(function(item,indx){
        indss.push(item.PartNumber)
    });
    var vm = this
    var rea = []
    this.partFiles.forEach(function(item,index){
       
        if(indss.indexOf(index+1) == -1){
            rea.push(item)
            vm.progressArr[index+1] = 0
        }else{
            rea.push('')
            vm.progressArr[index+1] = item.size
        }
    });
    vm.uploadController(rea)
}
// complete
s3MultiUpload.prototype.completeUpload = function(id,partss){
    var vm = this
    this.s3.completeMultipartUpload({
        Bucket: vm.Bucket,
        Key:vm.key,
        UploadId: id,
        MultipartUpload: {
            Parts: partss
        }, 
    },function(err,data){
        if(err){
            vm.onError(err,'分块组合出错')
        }else{
            vm.onProgress(100)
            vm.onSuccess(data)
        }
    })
}
s3MultiUpload.prototype.onError = function(data,item){
    this.onerror(data,item)
}
s3MultiUpload.prototype.onProgress = function(as){
    if(as){
        this.onprogress(as)
        return false
    }
    var a = 0
    if(this.stopFlag){
        return false
    }
    this.progressArr.forEach(function(item,indx){
        a += parseInt(item || '0')
    });
 
    var perc = Math.floor(a*100/this.total_size) == 1?99:a*100/this.total_size
    this.onprogress(Math.floor(perc))
}
s3MultiUpload.prototype.onSuccess = function(data){
    this.onsuccess(data)
}
s3MultiUpload.prototype.onUploadId = function(data){
    this.onuploadId(data)
}
s3MultiUpload.prototype.encodeName = function(name){
    var indss = name.lastIndexOf('.')
    var lasttig = name.slice(indss)
    return encodeURIComponent(name.slice(0,indss)) + lasttig;
}
// 文件分割
s3MultiUpload.prototype.fileSlice = function(file,num,size){
    var arr = []
    for(var i=1;i<=num;i++){
        var partfile = ''
        if(i<num){                    
            partfile = file.slice((i-1)*size,(i)*size)
        }else{
            partfile = file.slice((i-1)*size)
        }
        console.log(partfile.size)
        arr.push(partfile)
    }
    return arr
}
s3MultiUpload.prototype.getPartss = function(partss){
    var arr = []
    partss.forEach(function(item){
        var ot = {
            ETag: item.ETag, 
            PartNumber: item.PartNumber
        }
        arr.push(ot)
    });
    return arr
}
s3MultiUpload.prototype.abort = function(id){
    var vm = this
    // 获取不了 -- list
    // this.s3.abortMultipartUpload({
    //     Bucket: vm.Bucket,
    //     Key:vm.key,
    //     UploadId: vm.uploadId,
    // },function(err,data){
    //     if(err){
    //         vm.onError(err,'取消失败')
    //     }else{
    //         console.log(data)
    //         vm.stopFlag = false
    //     }
    // })
    this.uploadArr.forEach(function(item,index){
        item?item.abort():''
    });
    vm.onError('已终止上传')
    vm.stopFlag = true
}
s3MultiUpload.prototype.cotinueUpload = function(id){
    if(!id){
        this.onError('id不能为空！')
        return false
    }
    this.uploadId = id;
    this.stopFlag = false
    this.listParts(id)
    
}

/**------------------------- 分文件上传end ------------------------------------ */