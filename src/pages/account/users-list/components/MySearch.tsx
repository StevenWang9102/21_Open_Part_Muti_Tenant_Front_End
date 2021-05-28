import React, { useEffect, useState, FC } from 'react'
import { Input } from 'antd';
import 'antd/dist/antd.css';
import styles from '../style.less';
import { formatMessage } from 'umi';
import {clearSpaces} from '../../../public-component/clearSpaces'

const { Search } = Input;

export const MySearch = (props) => {

  const { dispatchFunction, searchValue, setSearchValue } = props

  return (
    <>
      <Search
        className={styles.search}
        placeholder="Search staff information"
        onSearch={(value) => {
          const keyword = clearSpaces(value)
          dispatchFunction('getAllUserInformation', { value: keyword });
        }}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        enterButton
      />

      <section
        className={styles.reset}
        onClick={() => {
          setSearchValue('');
          dispatchFunction('getAllUserInformation', { value: null });
        }}
      >
        {formatMessage({ id: 'user.management.reset' })}
      </section>
    </>
  )
}

