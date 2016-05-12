appControllers.controller( 'GrListCtrl', [ 'ENV', '$scope', '$stateParams', '$state', 'ApiService',
    function( ENV, $scope, $stateParams, $state, ApiService ) {
        var alertPopup = null;
        var alertPopupTitle = '';
        $scope.Rcbp1 = {};
        $scope.GrnNo = {};
        $scope.Imgr1s = {};
        $scope.refreshRcbp1 = function( BusinessPartyName ) {
            if(is.not.undefined(BusinessPartyName) && is.not.empty(BusinessPartyName)){
                var strUri = '/api/wms/rcbp1?BusinessPartyName=' + BusinessPartyName;
                ApiService.GetParam( strUri, false ).then( function success( result ) {
                    $scope.Rcbp1s = result.data.results;
                } );
            }
        };
        $scope.refreshGrnNos = function( Grn ) {
            if(is.not.undefined(Grn) && is.not.empty(Grn)){
                var strUri = '/api/wms/imgr1?GoodsReceiptNoteNo=' + Grn;
                ApiService.GetParam( strUri, false ).then( function success( result ) {
                    $scope.GrnNos = result.data.results;
                } );
            }
        };
        $scope.ShowImgr1 = function( Customer ) {
            if(is.not.undefined(Customer) && is.not.empty(Customer)){
                var strUri = '/api/wms/imgr1?CustomerCode=' + Customer;
                ApiService.GetParam( strUri, true ).then( function success( result ) {
                    $scope.Imgr1s = result.data.results;
                    if ( window.cordova && window.cordova.plugins.Keyboard ) {
                        cordova.plugins.Keyboard.close();
                    }
                    $( '#div-grt-list' ).focus();
                } );
            }
        };
        $scope.showDate = function( utc ) {
            return moment( utc ).format( 'DD-MMM-YYYY' );
        };
        $scope.GoToDetail = function( Imgr1 ) {
            if ( Imgr1 != null ) {
                $state.go( 'grDetail', {
                    'CustomerCode': Imgr1.CustomerCode,
                    'TrxNo': Imgr1.TrxNo,
                    'GoodsReceiptNoteNo': Imgr1.GoodsReceiptNoteNo
                }, {
                    reload: true
                } );
            }
        };
        $scope.returnMain = function() {
            $state.go( 'index.main', {}, {
                reload: true
            } );
        };
        $( '#div-list-rcbp' ).on( 'focus', ( function() {
            if ( window.cordova && window.cordova.plugins.Keyboard ) {
                cordova.plugins.Keyboard.close();
            }
        } ) );
        $( '#div-list-rcbp' ).focus();
        /*
        var BhEngine = new Bloodhound( {
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace( 'value' ),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            remote: {
                url: ENV.api + '/api/wms/rcbp1?BusinessPartyName=%QUERY&format=json',
                wildcard: '%QUERY',
                transform: function( result ) {
                    return $.map( result.data.results, function( rcbp1 ) {
                        return {
                            value: rcbp1.BusinessPartyName
                        };
                    } );
                }
            }
        } );
        BhEngine.initialize();
        $( '#scrollable-dropdown-menu .typeahead' ).typeahead( {
            hint: false,
            highlight: true,
            minLength: 1
        }, {
            name: 'BusinessPartyNames',
            limit: 10,
            displayKey: 'value',
            source: BhEngine.ttAdapter(),
            templates: {
                empty: [
                    '<div class="tt-empty-message">',
                    'No Results Found',
                    '</div>'
                ].join( '\n' ),
                suggestion: function( data ) {
                    return '<p><strong>' + data.value + '</strong></p>';
                }
            }
        } );
        $( 'input' ).on( [
            'typeahead:initialized',
            'typeahead:initialized:err',
            'typeahead:selected',
            'typeahead:autocompleted',
            'typeahead:cursorchanged',
            'typeahead:opened',
            'typeahead:closed'
        ].join( ' ' ), function( d ) {
            console.log( this.value );
        } );
        */
    }
] );

appControllers.controller( 'GrDetailCtrl', [ '$rootScope', '$scope', '$stateParams', '$state', '$http', '$timeout', '$ionicHistory', '$ionicLoading', '$ionicPopup', '$ionicModal', '$cordovaKeyboard', '$cordovaToast', '$cordovaBarcodeScanner', 'ApiService',
    function($rootScope, $scope, $stateParams, $state, $http, $timeout, $ionicHistory, $ionicLoading, $ionicPopup, $ionicModal, $$cordovaKeyboard, $cordovaToast, $cordovaBarcodeScanner, ApiService ) {
        var alertPopup = null;
        var hmImgr2 = new HashMap();
        var hmImsn1 = new HashMap();
        $scope.Detail = {
            Customer: $stateParams.CustomerCode,
            GRN: $stateParams.GoodsReceiptNoteNo,
            TrxNo: $stateParams.TrxNo,
            Scan: {
                BarCode: '',
                SerialNo: '',
                Qty: 0
            },
            Impr1: {},
            Imgr2s: {},
            Imgr2sDb:{}
        };
        $ionicModal.fromTemplateUrl( 'scan.html', {
            scope: $scope,
            animation: 'slide-in-up'
        } ).then( function( modal ) {
            $scope.modal = modal;
        } );
        $scope.$on( '$destroy', function() {
            $scope.modal.remove();
        } );
        var showPopup = function( title, type ){
            if (alertPopup === null) {
                alertPopup = $ionicPopup.alert( {
                    title: title,
                    okType: 'button-' + type
                } );
            } else {
                alertPopup.close();
                alertPopup = null;
            }
        };
        var setScanQty = function( barcode, imgr2 ) {
            if ( is.equal(imgr2.SerialNoFlag, 'Y') ) {
                $scope.Detail.Scan.Qty = imgr2.ScanQty;
                $( '#txt-sn' ).removeAttr( 'readonly' );
                $( '#txt-sn' ).select();
            } else {
                imgr2.ScanQty += 1;
                hmImgr2.remove( barcode );
                hmImgr2.set( barcode, imgr2 );
                db_update_Imgr2_Receipt(imgr2);
                $scope.Detail.Scan.Qty = imgr2.ScanQty;
                $scope.Detail.Scan.BarCode = '';
            }
            $scope.$apply();
        };
        var showImpr = function( barcode ) {
            if ( hmImgr2.has( barcode ) ) {
                var imgr2 = hmImgr2.get( barcode );
                $scope.Detail.Impr1.ProductCode = imgr2.ProductCode;
                $scope.Detail.Impr1.ProductDescription = imgr2.ProductDescription;
                setScanQty( barcode, imgr2 );
            } else {
                showPopup('Wrong BarCode', 'assertive');
            }
        };
        var setSnQty = function( barcode, imgr2 ) {
            imgr2.ScanQty += 1;
            hmImgr2.remove( barcode );
            hmImgr2.set( barcode, imgr2 );
            db_update_Imgr2_Receipt(imgr2);
            $scope.Detail.Scan.Qty = imgr2.ScanQty;
            $scope.Detail.Scan.SerialNo = '';
            $( '#txt-sn' ).select();
            $scope.$apply();
        };
        var ShowSn = function( sn ) {
            if ( is.not.empty(sn) ) {
                var barcode = $scope.Detail.Scan.BarCode,
                    SnArray = null,
                    imgr2 = hmImgr2.get( barcode );
                var imsn1 = {
                    ReceiptNoteNo: $scope.Detail.GRN,
                    ReceiptLineItemNo: imgr2.LineItemNo,
                    IssueNoteNo: '',
                    IssueLineItemNo: 0,
                    SerialNo: sn,
                };
                if ( hmImsn1.count() > 0 && hmImsn1.has( barcode ) ) {
                    SnArray = hmImsn1.get( barcode );
                    if ( is.not.inArray(sn, SnArray) ) {
                        SnArray.push( sn );
                        hmImsn1.remove( barcode );
                        hmImsn1.set( barcode, SnArray );
                    }else{
                        $scope.Detail.Scan.SerialNo = '';
                        $scope.$apply();
                        return;
                    }
                } else {
                    SnArray = new Array();
                    SnArray.push( sn );
                    hmImsn1.set( barcode, SnArray );
                }
                db_add_Imsn1_Receipt(imsn1);
                setSnQty( barcode, imgr2 );
            }
        };
        $scope.openCam = function( type ) {
            if ( is.equal( type, 'BarCode' ) ) {
                $cordovaBarcodeScanner.scan().then( function( imageData ) {
                    $scope.Detail.Scan.BarCode = imageData.text;
                    ShowProduct( $scope.Detail.Scan.BarCode, true );
                }, function( error ) {
                    $cordovaToast.showShortBottom( error );
                } );
            } else if ( is.equal( type, 'SerialNo' ) ) {
                if ( $( '#txt-sn' ).attr( 'readonly' ) != 'readonly' ) {
                    $cordovaBarcodeScanner.scan().then( function( imageData ) {
                        $scope.Detail.Scan.SerialNo = imageData.text;
                        ShowSn( $scope.Detail.Scan.SerialNo, false );
                    }, function( error ) {
                        $cordovaToast.showShortBottom( error );
                    } );
                }
            }

        };
        $scope.openModal = function() {
            $scope.modal.show();
            $ionicLoading.show();
            if ( dbWms ) {
                dbWms.transaction( function( tx ) {
                    dbSql = 'Select * from Imgr2_Receipt';
                    tx.executeSql( dbSql, [], function( tx, results ) {
                        $scope.Detail.Imgr2sDb = new Array();
                        for ( var i = 0; i < results.rows.length; i++ ) {
                            var imgr2 = {
                                TrxNo: results.rows.item( i ).TrxNo,
                                LineItemNo:results.rows.item( i ).LineItemNo,
                                ProductCode:results.rows.item( i ).ProductCode,
                                BarCode: results.rows.item( i ).BarCode,
                                ScanQty: results.rows.item( i ).ScanQty > 0 ? results.rows.item( i ).ScanQty : 0,
                                ActualQty:0
                            };
                            switch ( results.rows.item( i ).DimensionFlag ) {
                                case '1':
                                    imgr2.ActualQty = results.rows.item( i ).PackingQty;
                                    break;
                                case '2':
                                    imgr2.ActualQty = results.rows.item( i ).WholeQty;
                                    break;
                                default:
                                    imgr2.ActualQty = results.rows.item( i ).LooseQty;
                            }
                            $scope.Detail.Imgr2sDb.push( imgr2 );
                        }
                        $ionicLoading.hide();
                    }, dbError )
                } );
            }
        };
        $scope.closeModal = function() {
            $scope.Detail.Imgr2sDb = {};
            $scope.modal.hide();
        };
        $scope.returnList = function() {
            if ( $ionicHistory.backView() ) {
                $ionicHistory.goBack();
            } else {
                $state.go( 'grList', {}, {
                    reload: true
                } );
            }
        };
        $scope.clearInput = function( type ) {
            if ( is.equal( type, 'BarCode' ) ) {
                if ( $scope.Detail.Scan.BarCode.length > 0 ) {
                    $scope.Detail.Scan.BarCode = '';
                    $scope.Detail.Scan.SerialNo = '';
                    $scope.Detail.Scan.Qty = 0;
                    $scope.Detail.Impr1 = {};
                    $( '#txt-sn' ).attr( 'readonly', true );
                    $( '#txt-barcode' ).select();
                }
            } else if ( is.equal( type, 'SerialNo' ) ) {
                if ( $scope.Detail.Scan.SerialNo.length > 0 ) {
                    $scope.Detail.Scan.SerialNo = '';
                    $( '#txt-sn' ).select();
                }
            }
        };
        $scope.changeQty = function() {
            if ( is.not.empty($scope.Detail.Scan.BarCode) ) {
                if ( hmImgr2.count() > 0 && hmImgr2.has( $scope.Detail.Scan.BarCode ) ) {
                    var imgr2 = hmImgr2.get( $scope.Detail.Scan.BarCode );
                    var promptPopup = $ionicPopup.show( {
                        template: '<input type="number" ng-model="Detail.Scan.Qty">',
                        title: 'Enter Qty',
                        subTitle: 'Are you sure to change Qty manually?',
                        scope: $scope,
                        buttons: [ {
                            text: 'Cancel'
                        }, {
                            text: '<b>Save</b>',
                            type: 'button-positive',
                            onTap: function( e ) {
                                imgr2.ScanQty = $scope.Detail.Scan.Qty;
                                db_update_Imgr2_Receipt( imgr2 );
                            }
                        } ]
                    } );
                }
            }
        };
        $scope.checkConfirm = function() {
            $ionicLoading.show();
            if ( dbWms ) {
                dbWms.transaction( function( tx ) {
                    dbSql = 'Select * from Imgr2_Receipt';
                    tx.executeSql( dbSql, [], function( tx, results ) {
                        var len = results.rows.length;
                        if ( len > 0 ) {
                            var blnDiscrepancies = false;
                            for ( var i = 0; i < len; i++ ) {
                                var imgr2 = {
                                    TrxNo : results.rows.item( i ).TrxNo,
                                    LineItemNo : results.rows.item( i ).LineItemNo,
                                    ProductCode : results.rows.item( i ).ProductCode,
                                    ScanQty : results.rows.item( i ).ScanQty,
                                    BarCode : results.rows.item( i ).BarCode,
                                    Qty : 0
                                };
                                if ( imgr2.BarCode != null && imgr2.BarCode.length > 0 ) {
                                    switch ( results.rows.item( i ).DimensionFlag ) {
                                        case '1':
                                            imgr2.Qty = results.rows.item( i ).PackingQty;
                                            break;
                                        case '2':
                                            imgr2.Qty = results.rows.item( i ).WholeQty;
                                            break;
                                        default:
                                            imgr2.Qty = results.rows.item( i ).LooseQty;
                                    }
                                    if ( imgr2.Qty != imgr2.ScanQty ) {
                                        console.log( 'Product (' + imgr2.ProductCode + ') Qty not equal.' );
                                        blnDiscrepancies = true;
                                    }
                                } else {
                                    blnDiscrepancies = true;
                                }
                            }
                            if ( blnDiscrepancies ) {
                                $ionicLoading.hide();
                                onErrorConfirm();
                            } else {
                                sendConfirm();
                            }
                        }
                        else{
                            $ionicLoading.hide();
                            onErrorConfirm();
                        }
                    }, dbError )
                } );
            }
        };
        var onErrorConfirm = function(){
            var checkPopup = $ionicPopup.show( {
                title: 'Discrepancies on Qty.',
                buttons: [{
                    text: '<b>Check</b>',
                    type: 'button-assertive',
                    onTap: function( e ) {
                        checkPopup.close();
                        $scope.openModal();
                    }
                } ]
            } );
        };
        var sendConfirm = function() {
            var userID = sessionStorage.getItem( 'UserId' ).toString(),
                strUri = '';
            hmImgr2.forEach(function(value, key){
                var barcode = key, imgr2=value, SnArray=null, SerialNos='';
                if(is.equal(imgr2.SerialNoFlag,'Y')){
                    if ( hmImsn1.count() > 0 && hmImsn1.has( barcode ) ) {
                        SnArray = hmImsn1.get( barcode );
                    }
                    for(var i in SnArray){
                        SerialNos = SerialNos + ',' + SnArray[i];
                    }
                    SerialNos = SerialNos.substr(1,SerialNos.length);
                    strUri = '/api/wms/imsn1/create?ReceiptNoteNo=' + $scope.Detail.GRN + '&ReceiptLineItemNo=' + imgr2.LineItemNo + '&SerialNos=' + SerialNos + '&Imgr2TrxNo=' + imgr2.TrxNo;
                    ApiService.GetParam( strUri, true ).then( function success( result ) {
                    } );
                }
            });
            strUri = '/api/wms/imgr1/confirm?TrxNo=' + $scope.Detail.TrxNo + '&UserId=' + userID;
            ApiService.GetParam( strUri, true ).then( function success( result ) {
                alertPopup = $ionicPopup.alert( {
                    title: 'Confirm success.',
                    okType: 'button-calm'
                } );
                $timeout( function() {
                    alertPopup.close();
                    $scope.returnList();
                }, 2500 );
            } );
        };
        var GetImgr2ProductCode = function( GoodsReceiptNoteNo ) {
            var strUri = '/api/wms/imgr2/receipt?GoodsReceiptNoteNo=' + GoodsReceiptNoteNo;
            ApiService.GetParam( strUri, true ).then( function success( result ) {
                $scope.Detail.Imgr2s = result.data.results;
                db_del_Imgr2_Receipt();
                db_del_Imsn1_Receipt();
                for ( var i = 0; i < $scope.Detail.Imgr2s.length; i++ ) {
                    hmImgr2.set( $scope.Detail.Imgr2s[ i ].BarCode, $scope.Detail.Imgr2s[ i ] );
                    db_add_Imgr2_Receipt( $scope.Detail.Imgr2s[ i ] );
                }
            } );
        };
        GetImgr2ProductCode( $scope.Detail.GRN );
        $( '#txt-barcode' ).on( 'focus', ( function() {
            if ( window.cordova ) {
                $cordovaKeyboard.close();
            }
        } ) );
        $( '#txt-barcode' ).on( 'click', ( function() {
            if ( window.cordova ) {
                $cordovaKeyboard.close();
            }
        } ) );
        $( '#txt-barcode' ).on( 'keydown', function( e ) {
            if ( e.which === 9 || e.which === 13 ) {
                if (alertPopup === null) {
                    showImpr( $scope.Detail.Scan.BarCode);
                } else {
                    alertPopup.close();
                    alertPopup = null;
                }
            }
        } );
        $( '#txt-sn' ).on( 'keydown', function( e ) {
            if ( e.which === 9 || e.which === 13 ) {
                if (alertPopup === null) {
                    ShowSn( $scope.Detail.Scan.SerialNo );
                } else {
                    alertPopup.close();
                    alertPopup = null;
                }
            }
        } );
    }
] );
