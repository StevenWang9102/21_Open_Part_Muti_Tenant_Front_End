import React, { useEffect, useState } from 'react'
import { Modal, Form, Button, Popconfirm } from 'antd';
import { HashRouter as Router } from "react-router-dom";
// import { Dispatch } from "umi";
import { DatePicker, message } from 'antd';
import { Select, TreeSelect } from 'antd';
import moment from 'moment';
import sort from 'fast-sort';
import jsonpatch from 'fast-json-patch';

const { RangePicker } = DatePicker;
const { Option } = Select;

const layout = {
  labelCol: { span: 7 },
  wrapperCol: { span: 15 },
};


export const EditModal =  ({
  dispatch,
  ALL_STAFF,
  reservationList = [],
  visible,
  myTreeData,
  onCancelButtonClick,
  setVisible,
  currentRecord,
  fetAllReservation,
  currentBranchInfo,
  currentBeauticianInfo,
}) => {

  const ALL_BRANCH = 'All Branch'
  const NOT_MEMTIONED = 'Not memtioned'

  const [form] = Form.useForm()
  const [membersList, setMembersList] = useState<any>([])
  const [formValues, setFormValues] = useState<any>({})
  const [locationList, setLocationList] = useState<any>([])
  const [initials, setInitials] = useState<any>({})
  const [roleUserPairs, setRoleUserPairs] = useState<any>([])
  const [warningSet, setWarningSet] = useState({});
  const [myTreeDataLocal, setMyTreeDateLocal] = useState([]);

  const BRANCH_ROLE_PAIRS = 'BRANCH_ROLE_PAIRS'
  const branchRolePairs = JSON.parse(localStorage.getItem(BRANCH_ROLE_PAIRS)) || {}
  const currentBranchRole = branchRolePairs[currentBranchInfo.branchId] || {}
  const isDefaultStaffSelected = currentBranchRole.roleId && currentBranchRole.roleId != 'All Staff'

  console.log('EditModal48418,currentBeauticianInfo', currentBeauticianInfo);

  // 计算未选默认状态
  const filteredRoleUserPairs = []
  Array.isArray(roleUserPairs) && roleUserPairs.forEach(each => {
      const currentUserIds = filteredRoleUserPairs.map(each => each.userId)
      if (!currentUserIds.includes(each.userId)) filteredRoleUserPairs.push(each)
  })
  
  useEffect(() => {
    if(myTreeData.length !=0 ){
      // 计算有选默认的
    const temp1 = [{
      selectable: true,
      title: NOT_MEMTIONED,
      value: NOT_MEMTIONED,
      children: [],
    }]
  
    const targetRoleId = currentBranchRole.roleId
    const filteredStaff = myTreeData && myTreeData.filter(each=>each.title != ALL_STAFF && each.value === targetRoleId)
    const temp3 = (filteredStaff[0] && filteredStaff[0].children) || []
  
    console.log('useEffect5678,myTreeData', myTreeData);
    console.log('useEffect5678,filteredStaff', filteredStaff);
    console.log('useEffect5678,temp3', temp3);
  
    setMyTreeDateLocal([...temp1, ...temp3])
    }
  }, [myTreeData]);

  const ABSENCE = 'Absence'

  useEffect(() => {
    if (visible) {
      setWarningSet({})
      // 请求Booking信息
      dispatch({
        type: `reservation/fetchOneReservation`,
        payload: {
          id: currentRecord.id
        },
        callback: (res) => {
          console.log('fetchOneReservation,res', res);
          setFormValues(res)
          setInitials(res)
          requestBranchLoacation(res.branchId)
          requestBranchUsers(res.branchId)

          // 设置Form
          form.setFieldsValue({
            name: res.customerName,
            date: [moment(res.start), moment(res.end)],
            staff: res.beauticianId || NOT_MEMTIONED,
            locationId: res.locationId || NOT_MEMTIONED
          })
        }
      });

      // 请求客户信息
      dispatch({
        type: `menberManagement/fetchMembers`,
        callback: (res) => {
          console.log('fetchMembers,res', res.data);
          const temp = res.data.filter(each=>each.firstName !== ABSENCE)
          sort(temp).asc(each => each.firstName)
          setMembersList(temp)
        }
      });
    } else {
      form.resetFields()
      setFormValues({
        // ...formValues,
        start: '',
        end: 'endDateTime',
      })
    }
  }, [visible]);

  let branchBookings
  let currentBranchId = initials.branchId
  if(currentBranchId !== ALL_BRANCH){
    branchBookings = reservationList.filter(each=> each.branchId == currentBranchId)
  } else {
    branchBookings = reservationList
  }

  console.log('EditModal151,reservationList=', reservationList);
  console.log('EditModal151,currentBranchId=', currentBranchId);
  console.log('EditModal151,branchBookings=', branchBookings);

  // ------------------------------ 验证理发师时间 ------------------------------
  const validationOfBeautician = (startDateTime, endDateTime)=>{
    const beauticianId = form.getFieldValue('staff')
    const relevantBeauticianBookings = branchBookings.filter(each=>
      initials.id != each.id &&
      each.extendedProps.beauticianId == beauticianId )

    const targetStartDateTime = startDateTime && startDateTime.format("x") // Unix timestamp
    const targetEndDateTime = endDateTime && endDateTime.format("x")

    let flag = []

    relevantBeauticianBookings.forEach(each => {
      const startDateTime = moment(each.start).format("x") // Unix timestamp
      const endDateTime = moment(each.end).format("x") // Unix timestamp
      const situation1 = (targetStartDateTime <= startDateTime) && (targetEndDateTime <= startDateTime)
      const situation2 = (targetStartDateTime >= endDateTime) && (targetEndDateTime >= endDateTime)
      
      // 任意的选中时间，都必须在区间外面，
      if(situation1 || situation2) flag.push(true) 
      else flag.push(false)

    });
  
    if(flag.includes(false)){
      return false
    } else return true
  }


  // ---------------------------------- 验证地址的占有情况 ----------------------------------
  const validationOfLocation = (startDateTime, endDateTime, locationId)=>{
  
    const isLocationExist = locationId !== NOT_MEMTIONED && locationId

    if(!isLocationExist) {
      return true
    } else {
      const relevantLocationBookings = branchBookings.filter(each=>
        initials.id != each.id &&
        each.extendedProps.locationId == locationId
        )
  
        console.log('relevantLocationBookings',relevantLocationBookings );
  
      const targetStartDateTime = startDateTime && startDateTime.format("x") // Unix timestamp
      const targetEndDateTime = endDateTime && endDateTime.format("x")
  
      let flag = []
  
      relevantLocationBookings.forEach(each => {
        const startDateTime = moment(each.start).format("x") // Unix timestamp
        const endDateTime = moment(each.end).format("x") // Unix timestamp
  
        const situation1 = (targetStartDateTime <= startDateTime) && (targetEndDateTime <= startDateTime)
        const situation2 = (targetStartDateTime >= endDateTime) && (targetEndDateTime >= endDateTime)
        
        // 任意的选中时间，都必须在区间外面，
        if(situation1 || situation2){
          flag.push(true)
        } else {
          flag.push(false)
        }
      });
    
      if(flag.includes(false)){ return false
      } else return true
    }
  }


  // useEffect(() => {
  //   if (roleUserPairs.length !== 0) {
  //     // 生成树选择器的数据

  //     console.log('useEffect56,roleUserPairs', roleUserPairs);
      
  //     const myRoleList = []
  //     roleUserPairs.forEach(each => {
  //       const titles = myRoleList.map(each => each.title)

  //       if (titles.includes(each.roleName)) {
  //         // 如果出现过的Role，则在原有基础上，增加children
  //         const index = titles.indexOf(each.roleName)
  //         const originalChildren = myRoleList[index].children // 是数组，里面是对象
  //         const newChildren = [{
  //           title: each.userName,
  //           value: each.userId,
  //         }]
  //         myRoleList[index].children = [...originalChildren, ...newChildren]
  //       } else {
  //         myRoleList.push({
  //           selectable: false,
  //           title: each.roleName,
  //           value: each.roleId,
  //           children: [
  //             {
  //               title: each.userName,
  //               value: each.userId,
  //             }
  //           ],
  //         })
  //       }
  //     })
  //     console.log('currentRecord1681,roleUserPairs,myRoleList', myRoleList);

  //     setMyTreeData(myRoleList)
  //   }
  // }, [roleUserPairs])


  console.log('currentRecord1681,roleUserPairs', roleUserPairs);


  const requestBranchLoacation = (branchId) => {
    dispatch({
      type: `reservation/requestBranchLoacation`,
      payload: {
        branchId: branchId
      },
      callback: (res) => {
        console.log('requestBranchLoacation,res', res);
        setLocationList(res)
      }
    });
  }

  const requestBranchUsers = (branchId) => {
    dispatch({
      type: 'reservation/requestBranchUsers',
      payload: {
        branchId: branchId
      },
      callback: (res) => {
        try {
          console.log('requestBranchUsers41584,res', res);
          const roleUserPairs = res.map(each => {
            return {
              roleName: each.roleName,
              roleId: each.roleId,
              userId: each.userId,
              userName: each.userFullName,
            }
          })
          console.log('requestBranchUsers,roleUserPairs', roleUserPairs);
          setRoleUserPairs(roleUserPairs)
        } catch {
        }
      }
    })
  }


  const onUpdateClick = () => {
    const values = form.getFieldsValue()

    if (values.date && values.name) {
      const hide = message.loading('Updating...')

      const isStaffApplied = values.staff && values.staff !== NOT_MEMTIONED
      const isLocationApplied = values.locationId && values.locationId !== NOT_MEMTIONED

      let document = initials;
      let observer = jsonpatch.observe<Object>(document);

      console.log('onUpdateClick,values', values);
      console.log('onUpdateClick,document', document);
      console.log('onUpdateClick,document,formValues', formValues);

      document.start = formValues.start;
      document.end = formValues.end;
      document.customerId = formValues.customerId;
      document.customerName = formValues.customerName;
      document.isBeauticianApplied = isStaffApplied ? true : false;
      document.beauticianId = isStaffApplied ? formValues.beauticianId : null;
      document.beauticianName = isStaffApplied ? formValues.beauticianName : null;
      document.locationId = isLocationApplied ? formValues.locationId : null;

      const updateEnum = jsonpatch.generate(observer);
      console.log("onUpdateClick,updateEnum=", updateEnum);

      dispatch({
        type: 'reservation/updateReservation',
        payload: {
          id: formValues.id,
          body: updateEnum,
        },
        callback: () => {
          hide()
          fetAllReservation()
          setVisible(false)
        }
      })

    } else {
      message.error('Please check your customer name and date.')
    }
  }

  const onDeleteCustomer = (id) => {
    dispatch({
      type: `reservation/deleteReservation`,
      payload: {
        id: id,
      },
      callback: (res) => {
        fetAllReservation()
        setVisible(false)
      }
    });
  }

  function range(start, end) {
    const result = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  }

  
  function disabledDateTime() {
    return {
      disabledHours: () => range(0, 24).splice(0, 7),
      // disabledMinutes: () => range(30, 60),
      // disabledSeconds: () => [55, 56],
    };
  }

const STAFF_DISPLAY_NAME = 'STAFF_DISPLAY_NAME'
const staffName = localStorage.getItem(STAFF_DISPLAY_NAME) || 'Beautician'

  return (
    <Router>
      <Modal
        maskClosable={true}
        visible={visible}
        destroyOnClose={true}
        onCancel={() => { onCancelButtonClick() }}
        width='700px'
        bodyStyle={{ padding: '40px 60px' }}
        footer={[
          <Popconfirm
            title="Are you sure to delete this booking？"
            onConfirm={() => initials.id && onDeleteCustomer(initials.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              type="primary"
              danger
              style={{ float: 'left', marginLeft: 10 }}
            >
              Delete
            </Button>
          </Popconfirm>,

          <Button
            type="primary"
            style={{ marginLeft: 10 }}
            onClick={() => onUpdateClick()}
          >
            Update
          </Button>,

          <Button
            style={{ marginLeft: 10, float: 'right' }}
            onClick={() => { onCancelButtonClick() }}
          >
            Cancel
          </Button>,
        ]}
      >
        <Form
          {...layout}
          name="basic"
          form={form}
        >
          <>
            <h3 style={{ margin: '20px 0 15px 20px' }}>Basic Information</h3>

            <Form.Item
              label='Customer Name'
              name='name'
            >
              <Select
                style={{ width: "100%" }}
                onChange={(value, option) => {
                  console.log('onchange4181, formValues', formValues);
                  console.log('onchange4181, value', value);
                  console.log('onchange4181, option', option);

                  setFormValues({
                    ...formValues,
                    customerId: value,
                    customerName: option.name,
                  })
                }}
              >
                {membersList.map(each => {
                  const name = []
                  if (each.firstName) name.push(each.firstName)
                  if (each.middleName) name.push(each.middleName)
                  if (each.lastName) name.push(each.lastName)
                  return <Option value={each.id} name={name.join(' ')} >{name.join(' ')}</Option>
                })}

              </Select>
            </Form.Item>

            <Form.Item
              label='Date'
              name='date'
            >
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm A"
                showNow={true}
                minuteStep={15}
                use12Hours={true}
                disabledTime={()=>disabledDateTime()}
                ranges={{
                  'Today': [moment(8, "HH"), moment(9, "HH")],
                  // 'Tomorrow': [moment(8, "HH").add(1, 'days'), moment(9, "HH").add(2, 'days')],
                }}
                onChange={(time) => {
                  if (time) {
                    console.log('RangePicker,time', time);
                    console.log('RangePicker,formValues', formValues);

                    const startDateTime = time[0].format("YYYY-MM-DD HH:mm:ss")
                    const endDateTime = time[1].format("YYYY-MM-DD HH:mm:ss")

                    if (time[0].format("x") > time[1].format("x")) {
                      message.error('End time should be larger than start time.')
                    } else {
                      const locationId = form.getFieldValue('locationId')
                      const isPassed = validationOfBeautician(time[0], time[1] )
                      const isPassed1 = validationOfLocation(time[0], time[1], locationId)

                      setWarningSet({
                        Beautician: isPassed? 'Pass': 'error',
                        Location: isPassed1? 'Pass': 'error',
                      })

                      setFormValues({
                        ...formValues,
                        start: startDateTime,
                        end: endDateTime,
                      })
                    }
                  }
                }}
              />
            </Form.Item>

            <h3 style={{ margin: '50px 0 15px 20px' }}>More Information</h3>

            <Form.Item
              label={`${staffName.replace(/^\S/, s => s.toUpperCase())}`}
              name='staff'
              validateStatus={warningSet['Beautician']}
              help={warningSet['Beautician'] === 'error' && 'This beautician is occupied during this time period.'}
            >
              <Select
                showSearch
                style={{ width: "100%" }}
                placeholder='Select a beautician'
                value={currentBeauticianInfo.id || ALL_STAFF}
                optionFilterProp="children"
                onChange={(value, option) => {
                    console.log('Select.onChange,value', value);
                    console.log('Select.onChange,option', option);
                    console.log('Select.onChange,option.children', option.children);

                  setFormValues({
                    ...formValues,
                    beauticianId: value,
                    beauticianName: option.children,
                  })

                  const s1 = form.getFieldValue('start')
                  const s2 = form.getFieldValue('end')
                  const dateRange = form.getFieldValue('date')
                  
                  let isPassed;
                  if(s2 && s1){
                    isPassed = validationOfBeautician(s1, s2)
                  } else {
                    isPassed = validationOfBeautician(dateRange[0], dateRange[1])
                  }

                  setWarningSet({
                    ...warningSet,
                    'Beautician': isPassed? 'Pass': 'error'
                  })
                }}
                filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
            >

                {/* <Option value={NOT_MEMTIONED}>{NOT_MEMTIONED}</Option> */}
                {isDefaultStaffSelected && <> {myTreeDataLocal.map(each => {
                    return <Option value={each.value}>{each.title}</Option>
                })}</> }
                
                {!isDefaultStaffSelected && <> {filteredRoleUserPairs.map(each => {
                    return <Option value={each.userId}>{each.userName}</Option>
                })}</> }

            </Select>

              {/* <TreeSelect
                style={{ width: '100%' }}
                showArrow={false}
                showSearch={true}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                treeData={myTreeData}
                listHeight={400}
                placeholder="Please select"
                onChange={(value, option)=> {
                  // 设置新的Beautication 

                  console.log('TreeSelect.onChange,value', value);
                  console.log('TreeSelect.onChange,option', option[0]);

                  setFormValues({
                    ...formValues,
                    beauticianId: value,
                    beauticianName: option[0],
                  })


                  setValue(value)

                  const s1 = form.getFieldValue('start')
                  const s2 = form.getFieldValue('end')
                  const dateRange = form.getFieldValue('date')
                  
                  let isPassed;
                  if(s2 && s1){
                    isPassed = validationOfBeautician(s1, s2)
                  } else {
                    isPassed = validationOfBeautician(dateRange[0], dateRange[1])
                  }

                  setWarningSet({
                    ...warningSet,
                    'Beautician': isPassed? 'Pass': 'error'
                  })
                }}
              /> */}
            </Form.Item>

            <Form.Item
              label='Location'
              name='locationId'
              validateStatus={warningSet['Location']}
              help={warningSet['Location'] === 'error' && 'This location is occupied during this time period.'}
            >
              <Select
                style={{ width: "100%" }}
                onChange={(value, option) => {
                  console.log('onchange4961, formValues', formValues);
                  console.log('onchange4961, value', value);
                  console.log('onchange4961, option', option);

                  setFormValues({
                    ...formValues,
                    locationId: value,
                  })

                  const s1 = form.getFieldValue('start')
                  const s2 = form.getFieldValue('end')
                  const dateRange = form.getFieldValue('date')
                  
                  let isPassed;

                  if(s2 && s1){
                    isPassed = validationOfLocation(s1, s2, value)
                  } else isPassed = validationOfLocation(dateRange[0], dateRange[1], value )

                  setWarningSet({
                    ...warningSet,
                    'Location': isPassed? 'Pass': 'error'
                  })
                  
                }}
              >
                <Option value={NOT_MEMTIONED}>Not memtioned</Option>

                {Array.isArray(locationList) && locationList.map(each => {
                  if (each.isInactive) {
                    return null
                  } else {
                    return <Option value={each.id}>{each.name}</Option>
                  }
                })}

              </Select>
            </Form.Item>
          </>
        </Form>
      </Modal>
    </Router>
  )
}

